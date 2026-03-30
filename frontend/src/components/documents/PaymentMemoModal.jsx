import React, { useEffect, useMemo, useState } from 'react'
import { documentsAPI, streamsAPI } from '../../api/api'
import { useDialog } from '../DialogProvider'

const createPaymentRow = () => ({
  employee_name: '',
  employee_position: '',
  hours: '',
  rate_per_hour: '',
})

function PaymentMemoModal({ onClose }) {
  const [streams, setStreams] = useState([])
  const [selectedStream, setSelectedStream] = useState(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [payments, setPayments] = useState([createPaymentRow()])
  const [generating, setGenerating] = useState(false)
  const { alert } = useDialog()

  useEffect(() => {
    loadStreams()
  }, [])

  useEffect(() => {
    if (selectedStream) {
      loadStreamDetails(selectedStream)
    } else {
      setStartDate('')
      setEndDate('')
    }
  }, [selectedStream])

  const totals = useMemo(() => (
    payments.reduce((acc, payment) => {
      const hours = parseFloat(payment.hours) || 0
      const rate = parseFloat(payment.rate_per_hour) || 0
      const amount = hours * rate
      return {
        hours: acc.hours + hours,
        amount: acc.amount + amount,
      }
    }, { hours: 0, amount: 0 })
  ), [payments])

  const loadStreams = async () => {
    try {
      const response = await streamsAPI.getAll()
      setStreams(response.data)
    } catch (error) {
      console.error('Ошибка загрузки потоков:', error)
    }
  }

  const loadStreamDetails = async (streamId) => {
    try {
      const response = await streamsAPI.getById(streamId)
      const { start_date: streamStartDate, end_date: streamEndDate } = response.data
      setStartDate(streamStartDate ? new Date(streamStartDate).toISOString().split('T')[0] : '')
      setEndDate(streamEndDate ? new Date(streamEndDate).toISOString().split('T')[0] : '')
    } catch (error) {
      console.error('Ошибка загрузки данных потока:', error)
    }
  }

  const updatePayment = (index, field, value) => {
    setPayments((prev) => prev.map((payment, paymentIndex) => {
      if (paymentIndex !== index) {
        return payment
      }
      return {
        ...payment,
        [field]: value,
      }
    }))
  }

  const addPaymentRow = () => {
    setPayments((prev) => [...prev, createPaymentRow()])
  }

  const removePaymentRow = (index) => {
    if (payments.length === 1) {
      return
    }
    setPayments((prev) => prev.filter((_, paymentIndex) => paymentIndex !== index))
  }

  const isPaymentValid = (payment) => (
    payment.employee_name.trim()
    && payment.employee_position.trim()
    && parseFloat(payment.hours) > 0
    && parseFloat(payment.rate_per_hour) > 0
  )

  const handleGenerate = async () => {
    if (!selectedStream || payments.some((payment) => !isPaymentValid(payment))) {
      await alert('Заполните поток и все строки выплат')
      return
    }

    try {
      setGenerating(true)
      const response = await documentsAPI.generatePaymentMemo({
        stream_id: selectedStream,
        order_number: orderNumber || null,
        order_date: orderDate ? new Date(orderDate).toISOString() : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        payments: payments.map((payment) => ({
          employee_name: payment.employee_name.trim(),
          employee_position: payment.employee_position.trim(),
          hours: parseFloat(payment.hours),
          rate_per_hour: parseFloat(payment.rate_per_hour),
        })),
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Служебка_на_оплату_${new Date().toISOString().split('T')[0]}.docx`)
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
      <div className="modal-content" style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <h2>Служебная записка на оплату</h2>
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

        <div className="form-group">
          <label>Номер служебной записки</label>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Период с</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Период по</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Строки выплат *</label>
          <div style={{ display: 'grid', gap: '12px' }}>
            {payments.map((payment, index) => {
              const hours = parseFloat(payment.hours) || 0
              const rate = parseFloat(payment.rate_per_hour) || 0
              const amount = hours * rate

              return (
                <div key={index} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>ФИО сотрудника *</label>
                      <input
                        type="text"
                        value={payment.employee_name}
                        onChange={(e) => updatePayment(index, 'employee_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Должность *</label>
                      <input
                        type="text"
                        value={payment.employee_position}
                        onChange={(e) => updatePayment(index, 'employee_position', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div className="form-group">
                      <label>Часов *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={payment.hours}
                        onChange={(e) => updatePayment(index, 'hours', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Ставка за час *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payment.rate_per_hour}
                        onChange={(e) => updatePayment(index, 'rate_per_hour', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Сумма</label>
                      <input
                        type="text"
                        readOnly
                        value={amount ? amount.toFixed(2) : ''}
                        style={{ backgroundColor: '#f5f5f5' }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => removePaymentRow(index)}
                      disabled={payments.length === 1}
                      style={{ height: '40px' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={addPaymentRow}
            style={{ marginTop: '12px' }}
          >
            Добавить сотрудника
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Итого часов</label>
            <input type="text" readOnly value={totals.hours ? totals.hours.toFixed(2) : ''} style={{ backgroundColor: '#f5f5f5' }} />
          </div>

          <div className="form-group">
            <label>Итого сумма</label>
            <input type="text" readOnly value={totals.amount ? totals.amount.toFixed(2) : ''} style={{ backgroundColor: '#f5f5f5' }} />
          </div>
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || !selectedStream || payments.some((payment) => !isPaymentValid(payment))}
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

export default PaymentMemoModal
