import React, { useEffect, useState } from 'react'
import { documentsAPI, streamsAPI } from '../../api/api'
import { useDialog } from '../DialogProvider'

function EnrollmentOrderModal({ onClose, initialStreamId = null, initialStudentIds = [] }) {
  const [streams, setStreams] = useState([])
  const [selectedStream, setSelectedStream] = useState(initialStreamId)
  const [streamStudents, setStreamStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState(initialStudentIds)
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [enrollDate, setEnrollDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const { alert } = useDialog()

  useEffect(() => {
    loadStreams()
  }, [])

  useEffect(() => {
    if (selectedStream) {
      loadEnrolledStudents()
    } else {
      setStreamStudents([])
    }
  }, [selectedStream])

  useEffect(() => {
    setSelectedStream(initialStreamId)
  }, [initialStreamId])

  useEffect(() => {
    setSelectedStudentIds(initialStudentIds)
  }, [initialStudentIds])

  const loadStreams = async () => {
    try {
      const response = await streamsAPI.getAll()
      setStreams(response.data)
    } catch (error) {
      console.error('Ошибка загрузки потоков:', error)
    }
  }

  const loadEnrolledStudents = async () => {
    if (!selectedStream) return

    try {
      const response = await streamsAPI.getById(selectedStream)
      const enrolledStudents = response.data.students || []
      setStreamStudents(enrolledStudents)
      setSelectedStudentIds((prev) => {
        if (initialStreamId === selectedStream && initialStudentIds.length > 0) {
          return initialStudentIds
        }
        return prev.filter((studentId) => enrolledStudents.some((student) => student.id === studentId))
      })
    } catch (error) {
      console.error('Ошибка загрузки зачисленных студентов:', error)
    }
  }

  const handleStreamChange = (e) => {
    const streamId = parseInt(e.target.value, 10)
    const stream = streams.find((item) => item.id === streamId)
    setSelectedStream(stream ? streamId : null)
    setSelectedStudentIds([])
    setStreamStudents([])
  }

  const handleStudentToggle = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedStudentIds.length === streamStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(streamStudents.map((student) => student.id))
    }
  }

  const handleGenerate = async () => {
    if (!selectedStream || selectedStudentIds.length === 0) {
      await alert('Выберите поток и хотя бы одного студента')
      return
    }

    try {
      setGenerating(true)
      const response = await documentsAPI.generateEnrollmentOrder({
        stream_id: selectedStream,
        student_ids: selectedStudentIds,
        order_number: orderNumber || null,
        order_date: orderDate ? new Date(orderDate).toISOString() : null,
        enroll_date: enrollDate ? new Date(enrollDate).toISOString() : null,
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Приказ_о_зачислении_${new Date().toISOString().split('T')[0]}.docx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      await alert('Документ успешно сгенерирован и скачан')
      onClose()
    } catch (error) {
      console.error('Ошибка генерации документа:', error)
      await alert(error.response?.data?.detail || 'Ошибка генерации документа')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Приказ о зачислении</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label>Поток *</label>
          <select value={selectedStream || ''} onChange={handleStreamChange} required>
            <option value="">Выберите поток</option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name} (ID: {stream.id})
              </option>
            ))}
          </select>
        </div>

        {selectedStream && streamStudents.length > 0 && (
          <div className="form-group">
            <label>Студенты для приказа *</label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              В потоке: {streamStudents.length} студентов
            </p>
            <button
              type="button"
              className="btn btn-small btn-secondary"
              onClick={handleSelectAll}
              style={{ marginBottom: '10px' }}
            >
              {selectedStudentIds.length === streamStudents.length ? 'Снять выделение' : 'Выбрать всех'}
            </button>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
              {streamStudents.map((student) => (
                <label key={student.id} style={{ display: 'block', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                    style={{ marginRight: '8px' }}
                  />
                  {student.full_name} - {student.school_name}
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedStream && streamStudents.length === 0 && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            В этом потоке пока нет студентов.
          </p>
        )}

        <div className="form-group">
          <label>Номер приказа</label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Оставьте пустым для автоматической генерации"
          />
        </div>

        <div className="form-group">
          <label>Дата приказа</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Дата зачисления</label>
          <input
            type="date"
            value={enrollDate}
            onChange={(e) => setEnrollDate(e.target.value)}
          />
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || !selectedStream || selectedStudentIds.length === 0 || streamStudents.length === 0}
          >
            {generating ? 'Генерация...' : 'Сгенерировать и скачать'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnrollmentOrderModal
