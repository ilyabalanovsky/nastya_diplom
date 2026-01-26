import React, { useState, useEffect } from 'react'
import { studentsAPI, documentsAPI } from '../../api/api'

function AccessPassModal({ onClose }) {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0])
  const [validTo, setValidTo] = useState(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toISOString().split('T')[0]
  })
  const [passDate, setPassDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const response = await studentsAPI.getAll()
      setStudents(response.data)
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error)
    }
  }

  const handleGenerate = async () => {
    if (!selectedStudent) {
      alert('Выберите студента')
      return
    }

    try {
      setGenerating(true)
      const response = await documentsAPI.generateAccessPass({
        student_id: selectedStudent,
        valid_from: validFrom ? new Date(validFrom).toISOString() : null,
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        pass_date: passDate ? new Date(passDate).toISOString() : null
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      const student = students.find(s => s.id === selectedStudent)
      const filename = `Служебная_пропуск_${student?.full_name.replace(/\s/g, '_') || 'student'}_${new Date().toISOString().split('T')[0]}.docx`
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      alert('Документ успешно сгенерирован и скачан')
      onClose()
    } catch (error) {
      console.error('Ошибка генерации документа:', error)
      console.error('Ошибка генерации документа')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Служебная записка на пропуск</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label>Студент *</label>
          <select
            value={selectedStudent || ''}
            onChange={(e) => setSelectedStudent(parseInt(e.target.value) || null)}
            required
          >
            <option value="">Выберите студента</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.full_name} - {student.school_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Пропуск действителен с</label>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Пропуск действителен по</label>
          <input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Дата выдачи пропуска</label>
          <input
            type="date"
            value={passDate}
            onChange={(e) => setPassDate(e.target.value)}
          />
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || !selectedStudent}
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
