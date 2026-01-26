import React, { useState, useEffect } from 'react'
import { streamsAPI } from '../api/api'

function StreamModal({ stream, courses, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    start_date: '',
    end_date: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stream) {
      setFormData({
        name: stream.name || '',
        course_id: stream.course_id || '',
        start_date: stream.start_date ? stream.start_date.split('T')[0] : '',
        end_date: stream.end_date ? stream.end_date.split('T')[0] : '',
      })
    }
  }, [stream])

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
      const submitData = {
        ...formData,
        course_id: parseInt(formData.course_id),
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      }

      if (stream) {
        await streamsAPI.update(stream.id, submitData)
      } else {
        await streamsAPI.create(submitData)
      }
      onSave()
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      const errorMessage = error.response?.data?.detail || 'Ошибка сохранения данных'
      console.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{stream ? 'Редактировать поток' : 'Добавить поток'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название потока *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Курс *</label>
            <select
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              required
            >
              <option value="">Выберите курс</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Дата начала</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Дата окончания</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
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

export default StreamModal
