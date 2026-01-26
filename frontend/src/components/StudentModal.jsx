import React, { useState, useEffect } from 'react'
import { studentsAPI } from '../api/api'

function StudentModal({ student, onClose, onSave }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    school_name: '',
    parent_name: '',
    parent_phone: '',
    desired_course_name: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (student) {
      setFormData({
        full_name: student.full_name || '',
        phone: student.phone || '',
        email: student.email || '',
        school_name: student.school_name || '',
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
        desired_course_name: student.desired_course_name || '',
      })
    }
  }, [student])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (student) {
        await studentsAPI.update(student.id, formData)
      } else {
        await studentsAPI.create(formData)
      }
      onSave()
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка сохранения данных')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{student ? 'Редактировать студента' : 'Добавить студента'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ФИО студента *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Номер телефона студента *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email студента *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Название школы *</label>
            <input
              type="text"
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>ФИО родителя *</label>
            <input
              type="text"
              name="parent_name"
              value={formData.parent_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Номер телефона родителя *</label>
            <input
              type="tel"
              name="parent_phone"
              value={formData.parent_phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Название курса (желаемый)</label>
            <input
              type="text"
              name="desired_course_name"
              value={formData.desired_course_name}
              onChange={handleChange}
            />
          </div>

          <div className="actions" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StudentModal
