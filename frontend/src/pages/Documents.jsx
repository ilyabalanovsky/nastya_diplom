import React, { useState, useEffect } from 'react'
import { streamsAPI, coursesAPI, studentsAPI, documentsAPI } from '../api/api'
import EnrollmentOrderModal from '../components/documents/EnrollmentOrderModal'
import UnenrollmentOrderModal from '../components/documents/UnenrollmentOrderModal'
import PaymentMemoModal from '../components/documents/PaymentMemoModal'
import AccessPassModal from '../components/documents/AccessPassModal'

function Documents() {
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false)
  const [showUnenrollmentModal, setShowUnenrollmentModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAccessPassModal, setShowAccessPassModal] = useState(false)

  return (
    <div className="container">
      <div className="page-header">
        <h2>Генерация документов</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div className="card">
          <h3>Приказ о зачислении</h3>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Генерация приказа о зачислении студентов на поток курса
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowEnrollmentModal(true)}
          >
            Создать приказ
          </button>
        </div>

        <div className="card">
          <h3>Приказ об отчислении</h3>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Генерация приказа об отчислении студентов с потока
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowUnenrollmentModal(true)}
          >
            Создать приказ
          </button>
        </div>

        <div className="card">
          <h3>Служебная записка на оплату</h3>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Генерация служебной записки на оплату сотрудникам вуза
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowPaymentModal(true)}
          >
            Создать записку
          </button>
        </div>

        <div className="card">
          <h3>Служебная записка на пропуск</h3>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Генерация служебной записки на пропуск в вуз для студента
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAccessPassModal(true)}
          >
            Создать записку
          </button>
        </div>
      </div>

      {showEnrollmentModal && (
        <EnrollmentOrderModal
          onClose={() => setShowEnrollmentModal(false)}
        />
      )}

      {showUnenrollmentModal && (
        <UnenrollmentOrderModal
          onClose={() => setShowUnenrollmentModal(false)}
          hideDatabaseOption={false}
        />
      )}

      {showPaymentModal && (
        <PaymentMemoModal
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showAccessPassModal && (
        <AccessPassModal
          onClose={() => setShowAccessPassModal(false)}
        />
      )}
    </div>
  )
}

export default Documents
