import React, { useEffect, useState } from 'react'
import { documentsAPI, streamsAPI } from '../../api/api'
import { useDialog } from '../DialogProvider'

function AccessPassModal({ onClose }) {
  const [streams, setStreams] = useState([])
  const [selectedStream, setSelectedStream] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const { alert } = useDialog()

  useEffect(() => {
    loadStreams()
  }, [])

  useEffect(() => {
    if (selectedStream) {
      loadStreamStudents(selectedStream)
    } else {
      setStudents([])
      setSelectedStudentIds([])
      setStartDate('')
    }
  }, [selectedStream])

  const loadStreams = async () => {
    try {
      const response = await streamsAPI.getAll()
      setStreams(response.data)
    } catch (error) {
      console.error('Ошибка загрузки потоков:', error)
    }
  }

  const loadStreamStudents = async (streamId) => {
    try {
      const response = await streamsAPI.getById(streamId)
      setStudents(response.data.students || [])
      setSelectedStudentIds([])
      setStartDate(response.data.start_date ? new Date(response.data.start_date).toISOString().split('T')[0] : '')
    } catch (error) {
      console.error('Ошибка загрузки студентов потока:', error)
    }
  }

  const handleStudentToggle = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(students.map((student) => student.id))
    }
  }

  const handleGenerate = async () => {
    if (!selectedStream || selectedStudentIds.length === 0) {
      await alert('Выберите поток и хотя бы одного студента')
      return
    }

    try {
      setGenerating(true)
      const response = await documentsAPI.generateAccessPass({
        stream_id: selectedStream,
        student_ids: selectedStudentIds,
        order_number: orderNumber || null,
        order_date: orderDate ? new Date(orderDate).toISOString() : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Служебная_записка_на_пропуск_${new Date().toISOString().split('T')[0]}.docx`)
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
          <h2>Служебная записка на пропуск</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label>Поток *</label>
          <select
            value={selectedStream || ''}
            onChange={(e) => setSelectedStream(parseInt(e.target.value, 10) || null)}
            required
          >
            <option value="">Выберите поток</option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name} (ID: {stream.id})
              </option>
            ))}
          </select>
        </div>

        {selectedStream && students.length > 0 && (
          <div className="form-group">
            <label>Студенты для пропуска *</label>
            <button
              type="button"
              className="btn btn-small btn-secondary"
              onClick={handleSelectAll}
              style={{ marginBottom: '10px' }}
            >
              {selectedStudentIds.length === students.length ? 'Снять выделение' : 'Выбрать всех'}
            </button>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
              {students.map((student) => (
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

        {selectedStream && students.length === 0 && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            В выбранном потоке нет студентов.
          </p>
        )}

        <div className="form-group">
          <label>Номер документа</label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Оставьте пустым для автоматической генерации"
          />
        </div>

        <div className="form-group">
          <label>Дата документа</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Дата начала занятий</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || !selectedStream || selectedStudentIds.length === 0}
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

export default AccessPassModal
