import React, { useState, useEffect } from 'react'
import { streamsAPI, studentsAPI } from '../api/api'
import { useDialog } from './DialogProvider'
import { ensureArray } from '../utils/ensureArray'

function EnrollModal({ stream, onClose, onSave }) {
  const [students, setStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const { alert, confirm } = useDialog()

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const response = await studentsAPI.getAll()
      const enrolledIds = stream.students?.map(s => s.id) || []
      const availableStudents = ensureArray(response.data).filter(s => !enrolledIds.includes(s.id))
      setStudents(availableStudents)
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error)
      console.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredStudents.map((student) => student.id))
    }
  }

  const filteredStudents = students.filter((student) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.school_name.toLowerCase().includes(query)
    )
  })

  const handleEnroll = async (e) => {
    e.preventDefault()
    
    if (selectedStudentIds.length === 0) {
      await alert('Выберите хотя бы одного студента')
      return
    }

    try {
      setEnrolling(true)
      const results = await Promise.allSettled(
        selectedStudentIds.map((studentId) => streamsAPI.enroll(studentId, stream.id))
      )
      const failed = results.filter((result) => result.status === 'rejected')
      const succeededStudentIds = selectedStudentIds.filter((_, index) => results[index].status === 'fulfilled')
      const successCount = results.length - failed.length

      if (failed.length > 0) {
        await alert(`Зачислено: ${successCount}. Ошибок: ${failed.length}`)
      } else {
        await alert(`Успешно зачислено: ${successCount}`)
      }

      if (succeededStudentIds.length > 0 && (await confirm('Сгенерировать приказ о зачислении?'))) {
        onSave({
          openEnrollmentOrder: true,
          streamId: stream.id,
          studentIds: succeededStudentIds,
        })
        return
      }

      onSave()
    } catch (error) {
      console.error('Ошибка зачисления:', error)
      const errorMessage = error.response?.data?.detail || 'Ошибка зачисления студента'
      console.error(errorMessage)
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Зачислить студента в поток: {stream.name}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div>Загрузка...</div>
        ) : students.length === 0 ? (
          <div>
            <p>Все доступные студенты уже зачислены в этот поток.</p>
            <button className="btn btn-secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={handleEnroll}>
            <div className="form-group">
              <label>Выберите студентов *</label>
              <div className="select-toolbar">
                <input
                  type="text"
                  placeholder="Поиск по ФИО, email или школе..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={handleSelectAll}
                >
                  {selectedStudentIds.length === filteredStudents.length ? 'Снять выделение' : 'Выбрать всех'}
                </button>
              </div>
              <div className="select-meta">
                Выбрано: {selectedStudentIds.length} из {filteredStudents.length}
              </div>
              <div className="select-list">
                {filteredStudents.map((student) => (
                  <label key={student.id} className="select-item">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => handleToggleStudent(student.id)}
                    />
                    <div className="select-item-text">
                      <div className="select-item-title">{student.full_name}</div>
                      <div className="select-item-sub">
                        {student.email} · {student.school_name}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={enrolling || selectedStudentIds.length === 0}
              >
                {enrolling ? 'Зачисление...' : 'Зачислить выбранных'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EnrollModal
