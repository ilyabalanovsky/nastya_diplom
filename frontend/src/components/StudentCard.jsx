import React, { useState, useEffect } from 'react'
import { communicationAPI } from '../api/api'

function StudentCard({ student, onClose }) {
  const [contactInfo, setContactInfo] = useState(null)

  useEffect(() => {
    loadContactInfo()
  }, [student.id])

  const loadContactInfo = async () => {
    try {
      const response = await communicationAPI.getContactInfo(student.id)
      setContactInfo(response.data)
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error)
    }
  }

  const handleEmailClick = (email) => {
    window.location.href = `mailto:${email}`
  }

  const handlePhoneClick = (phone) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Карточка студента</h3>
        <button className="btn btn-secondary" onClick={onClose}>
          Закрыть
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>ФИО:</strong> {student.full_name}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Email:</strong> {student.email}
        <div className="contact-links">
          <button
            className="btn btn-small btn-primary"
            onClick={() => handleEmailClick(student.email)}
          >
            📧 Написать email
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Телефон:</strong> {student.phone}
        <div className="contact-links">
          <button
            className="btn btn-small btn-primary"
            onClick={() => handlePhoneClick(student.phone)}
          >
            📞 Позвонить
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Школа:</strong> {student.school_name}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Желаемый курс:</strong> {student.desired_course_name || 'Не указан'}
      </div>

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
        <h4>Контактная информация родителя</h4>
        <div style={{ marginTop: '10px' }}>
          <strong>ФИО родителя:</strong> {student.parent_name}
        </div>
        <div style={{ marginTop: '10px' }}>
          <strong>Телефон родителя:</strong> {student.parent_phone}
          <div className="contact-links">
            <button
              className="btn btn-small btn-primary"
              onClick={() => handlePhoneClick(student.parent_phone)}
            >
              📞 Позвонить родителю
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <div>Дата создания: {new Date(student.created_at).toLocaleString('ru-RU')}</div>
        {student.updated_at && (
          <div>Последнее обновление: {new Date(student.updated_at).toLocaleString('ru-RU')}</div>
        )}
      </div>
    </div>
  )
}

export default StudentCard
