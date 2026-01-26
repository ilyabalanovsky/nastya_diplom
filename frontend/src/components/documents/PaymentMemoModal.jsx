import React, { useState, useEffect } from 'react'
import { streamsAPI, documentsAPI } from '../../api/api'

function PaymentMemoModal({ onClose }) {
  const [streams, setStreams] = useState([])
  const [selectedStream, setSelectedStream] = useState(null)
  const [instructorName, setInstructorName] = useState('')
  const [hours, setHours] = useState('')
  const [ratePerHour, setRatePerHour] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [memoDate, setMemoDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadStreams()
  }, [])

  useEffect(() => {
    if (hours && ratePerHour) {
      const total = parseFloat(hours) * parseFloat(ratePerHour)
      setTotalAmount(total.toFixed(2))
    } else {
      setTotalAmount('')
    }
  }, [hours, ratePerHour])

  const loadStreams = async () => {
    try {
      const response = await streamsAPI.getAll()
      setStreams(response.data)
    } catch (error) {
      console.error('Ошибка загрузки потоков:', error)
    }
  }

  const handleGenerate = async () => {
    if (!selectedStream || !instructorName || !hours || !ratePerHour) {
      alert('Заполните все обязательные поля')
      return
    }

    try {
      setGenerating(true)
      const response = await documentsAPI.generatePaymentMemo({
        stream_id: selectedStream,
        instructor_name: instructorName,
        hours: parseFloat(hours),
        rate_per_hour: parseFloat(ratePerHour),
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        memo_date: memoDate ? new Date(memoDate).toISOString() : null
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Служебка_на_оплату_${new Date().toISOString().split('T')[0]}.docx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      alert('Документ успешно сгенерирован и скачан')
      onClose()
    } catch (error) {
      console.error('Ошибка генерации документа:', error)
      alert('Ошибка генерации документа')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Служебная записка на оплату</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label>Поток *</label>
          <select
            value={selectedStream || ''}
            onChange={(e) => setSelectedStream(parseInt(e.target.value) || null)}
            required
          >
            <option value="">Выберите поток</option>
            {streams.map(stream => (
              <option key={stream.id} value={stream.id}>
                {stream.name} (ID: {stream.id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>ФИО преподавателя *</label>
          <input
            type="text"
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Количество часов *</label>
          <input
            type="number"
            step="0.1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Ставка за час (руб.) *</label>
          <input
            type="number"
            step="0.01"
            value={ratePerHour}
            onChange={(e) => setRatePerHour(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Общая сумма (руб.)</label>
          <input
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="Рассчитывается автоматически"
            readOnly
            style={{ backgroundColor: '#f5f5f5' }}
          />
        </div>

        <div className="form-group">
          <label>Дата служебной записки</label>
          <input
            type="date"
            value={memoDate}
            onChange={(e) => setMemoDate(e.target.value)}
          />
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || !selectedStream || !instructorName || !hours || !ratePerHour}
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
