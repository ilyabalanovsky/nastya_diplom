import React, { useState, useEffect } from 'react'
import { streamsAPI, coursesAPI, studentsAPI } from '../api/api'
import StreamModal from '../components/StreamModal'
import EnrollModal from '../components/EnrollModal'
import EnrollmentOrderModal from '../components/documents/EnrollmentOrderModal'
import UnenrollmentOrderModal from '../components/documents/UnenrollmentOrderModal'
import { useDialog } from '../components/DialogProvider'
import { ensureArray } from '../utils/ensureArray'

function Streams() {
  const [streams, setStreams] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollTargetStream, setEnrollTargetStream] = useState(null)
  const [editingStream, setEditingStream] = useState(null)
  const [selectedStream, setSelectedStream] = useState(null)
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [showEnrollmentOrderModal, setShowEnrollmentOrderModal] = useState(false)
  const [pendingEnrollmentOrder, setPendingEnrollmentOrder] = useState(null)
  const [showUnenrollmentModal, setShowUnenrollmentModal] = useState(false)
  const [pendingUnenrollment, setPendingUnenrollment] = useState(null)
  const { confirm } = useDialog()

  useEffect(() => {
    loadStreams()
    loadCourses()
  }, [])

  const loadStreams = async () => {
    try {
      setLoading(true)
      const response = await streamsAPI.getAll()
      setStreams(ensureArray(response.data))
    } catch (error) {
      console.error('Ошибка загрузки потоков:', error)
      console.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const response = await coursesAPI.getAll()
      setCourses(ensureArray(response.data))
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error)
    }
  }

  const loadStreamDetails = async (streamId) => {
    try {
      const response = await streamsAPI.getById(streamId)
      setSelectedStream({
        ...response.data,
        students: ensureArray(response.data?.students),
      })
    } catch (error) {
      console.error('Ошибка загрузки деталей потока:', error)
    }
  }

  const handleCreate = () => {
    setEditingStream(null)
    setShowModal(true)
  }

  const handleEdit = (stream) => {
    setEditingStream(stream)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Вы уверены, что хотите удалить этот поток?'))) {
      return
    }

    try {
      await streamsAPI.delete(id)
      loadStreams()
      if (selectedStream && selectedStream.id === id) {
        setSelectedStream(null)
      }
    } catch (error) {
      console.error('Ошибка удаления:', error)
      console.error('Ошибка удаления потока')
    }
  }

  const handleSave = () => {
    setShowModal(false)
    setEditingStream(null)
    loadStreams()
  }

  const handleViewDetails = (stream) => {
    loadStreamDetails(stream.id)
  }

  const handleEnroll = async (stream) => {
    try {
      const response = await streamsAPI.getById(stream.id)
      setEnrollTargetStream({
        ...response.data,
        students: ensureArray(response.data?.students),
      })
      setShowEnrollModal(true)
    } catch (error) {
      console.error('Ошибка загрузки потока для зачисления:', error)
      console.error('Не удалось открыть форму зачисления')
    }
  }

  const handleUnenroll = async (studentId, streamId) => {
    if (!(await confirm('Вы уверены, что хотите отчислить этого студента?'))) {
      return
    }

    try {
      const shouldGenerateOrder = await confirm('Сгенерировать приказ об отчислении?')
      if (shouldGenerateOrder) {
        setPendingUnenrollment({
          streamId,
          studentIds: [studentId],
        })
        setShowUnenrollmentModal(true)
        return
      }

      await streamsAPI.unenroll(studentId, streamId)
      if (selectedStream && selectedStream.id === streamId) {
        loadStreamDetails(streamId)
      }
      loadStreams()
    } catch (error) {
      console.error('Ошибка отчисления:', error)
      console.error('Ошибка отчисления студента')
    }
  }

  const handleUnenrollmentComplete = ({ streamId }) => {
    setShowUnenrollmentModal(false)
    setPendingUnenrollment(null)
    if (selectedStream && selectedStream.id === streamId) {
      loadStreamDetails(streamId)
    }
    loadStreams()
  }

  const handleEnrollSave = (payload = null) => {
    setShowEnrollModal(false)
    setEnrollTargetStream(null)

    if (payload?.openEnrollmentOrder) {
      setPendingEnrollmentOrder({
        streamId: payload.streamId,
        studentIds: payload.studentIds,
      })
      setShowEnrollmentOrderModal(true)
    }

    if (selectedStream) {
      loadStreamDetails(selectedStream.id)
    }
    loadStreams()
  }

  const filteredStreams = selectedCourseId
    ? streams.filter(s => s.course_id === selectedCourseId)
    : streams

  if (loading) {
    return <div className="container">Загрузка...</div>
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Потоки</h2>
        <div className="actions">
          <select
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null)}
            style={{ padding: '8px', marginRight: '10px' }}
          >
            <option value="">Все курсы</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleCreate}>
            Добавить поток
          </button>
        </div>
      </div>

      {selectedStream ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Поток: {selectedStream.name}</h3>
            <button className="btn btn-secondary" onClick={() => setSelectedStream(null)}>
              Закрыть
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>Курс:</strong> {courses.find(c => c.id === selectedStream.course_id)?.name || 'Неизвестно'}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <strong>Студентов в потоке:</strong> {selectedStream.students?.length || 0}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="actions">
              <button
                className="btn btn-success"
                onClick={() => handleEnroll(selectedStream)}
              >
                Зачислить студентов
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedStream(null)}>
                Вернуться к списку потоков
              </button>
            </div>
          </div>

          {selectedStream.students && selectedStream.students.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th>Телефон</th>
                  <th>Школа</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {selectedStream.students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.full_name}</td>
                    <td>{student.email}</td>
                    <td>{student.phone}</td>
                    <td>{student.school_name}</td>
                    <td>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleUnenroll(student.id, selectedStream.id)}
                      >
                        Отчислить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>В этом потоке пока нет студентов</p>
          )}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Курс</th>
              <th>Студентов</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredStreams.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                  Нет данных
                </td>
              </tr>
            ) : (
              filteredStreams.map((stream) => {
                const course = courses.find(c => c.id === stream.course_id)
                return (
                  <tr key={stream.id}>
                    <td>{stream.name}</td>
                    <td>{course?.name || 'Неизвестно'}</td>
                    <td>
                      <span className="badge badge-primary">
                        {typeof stream.student_count === 'number'
                          ? stream.student_count
                          : (stream.students ? stream.students.length : 0)}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => handleViewDetails(stream)}
                        >
                          Студенты
                        </button>
                        <button
                          className="btn btn-small btn-success"
                          onClick={() => handleEnroll(stream)}
                        >
                          Зачислить
                        </button>
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => handleEdit(stream)}
                        >
                          Редактировать
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(stream.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <StreamModal
          stream={editingStream}
          courses={courses}
          onClose={() => {
            setShowModal(false)
            setEditingStream(null)
          }}
          onSave={handleSave}
        />
      )}

      {showEnrollModal && enrollTargetStream && (
        <EnrollModal
          stream={enrollTargetStream}
          onClose={() => {
            setShowEnrollModal(false)
            setEnrollTargetStream(null)
          }}
          onSave={handleEnrollSave}
        />
      )}

      {showEnrollmentOrderModal && pendingEnrollmentOrder && (
        <EnrollmentOrderModal
          onClose={() => {
            setShowEnrollmentOrderModal(false)
            setPendingEnrollmentOrder(null)
          }}
          initialStreamId={pendingEnrollmentOrder.streamId}
          initialStudentIds={pendingEnrollmentOrder.studentIds}
        />
      )}

      {showUnenrollmentModal && pendingUnenrollment && (
        <UnenrollmentOrderModal
          onClose={() => {
            setShowUnenrollmentModal(false)
            setPendingUnenrollment(null)
          }}
          initialStreamId={pendingUnenrollment.streamId}
          initialStudentIds={pendingUnenrollment.studentIds}
          hideDatabaseOption
          autoUnenrollAfterGenerate
          onComplete={handleUnenrollmentComplete}
        />
      )}
    </div>
  )
}

export default Streams
