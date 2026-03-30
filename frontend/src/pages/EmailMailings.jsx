import React, { useEffect, useMemo, useState } from 'react'
import { coursesAPI, mailingsAPI, streamsAPI } from '../api/api'
import { useDialog } from '../components/DialogProvider'
import { ensureArray } from '../utils/ensureArray'

const PLACEHOLDERS = [
  '{{student_name}}',
  '{{stream_name}}',
  '{{course_name}}',
  '{{school_name}}',
  '{{parent_name}}',
]

const DEFAULT_MESSAGE = `Здравствуйте, {{student_name}}!

Вы получаете письмо по потоку "{{stream_name}}" программы "{{course_name}}".

С уважением,
Факультет компьютерных наук`

function renderTemplate(template, context) {
  return Object.entries(context).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value || ''),
    template,
  )
}

function formatDate(value) {
  if (!value) {
    return 'Дата не указана'
  }

  return new Date(value).toLocaleDateString('ru-RU')
}

function MailingStatusModal({ status, result, errorMessage, onClose }) {
  if (status === 'idle') {
    return null
  }

  const isSending = status === 'sending'
  const isSuccess = status === 'success'
  const isPartial = status === 'partial'

  return (
    <div className="modal">
      <div className="modal-content mailing-status-modal">
        <div className="modal-header">
          <h2>
            {isSending && 'Отправка рассылки'}
            {isSuccess && 'Рассылка отправлена'}
            {isPartial && 'Рассылка отправлена частично'}
            {status === 'error' && 'Ошибка отправки'}
          </h2>
          {!isSending && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        {isSending ? (
          <div className="mailing-status-body">
            <p>Письма отправляются. Это окно закроется после завершения операции.</p>
          </div>
        ) : (
          <div className="mailing-status-body">
            {result && (
              <>
                <div className="mailing-status-stats">
                  <div><strong>Поток:</strong> {result.stream_name}</div>
                  <div><strong>Всего получателей:</strong> {result.total_recipients}</div>
                  <div><strong>Отправлено:</strong> {result.sent_count}</div>
                  <div><strong>Не удалось:</strong> {result.failed_count}</div>
                  <div><strong>Пропущено:</strong> {result.skipped_count}</div>
                </div>

                {ensureArray(result.failed_recipients).length > 0 && (
                  <div className="mailing-status-errors">
                    <strong>Ошибки отправки</strong>
                    <div className="mailing-status-error-list">
                      {ensureArray(result.failed_recipients).map((item) => (
                        <div key={`${item.student_id}-${item.email}`} className="mailing-status-error-item">
                          <div>{item.student_name} &lt;{item.email}&gt;</div>
                          <div>{item.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!result && errorMessage && (
              <p>{errorMessage}</p>
            )}
          </div>
        )}

        {!isSending && (
          <div className="actions dialog-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmailMailings() {
  const [streams, setStreams] = useState([])
  const [courses, setCourses] = useState([])
  const [selectedStreamId, setSelectedStreamId] = useState('')
  const [selectedStream, setSelectedStream] = useState(null)
  const [previewStudentId, setPreviewStudentId] = useState(null)
  const [subject, setSubject] = useState('Информация по потоку {{stream_name}}')
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusModal, setStatusModal] = useState({
    status: 'idle',
    result: null,
    errorMessage: '',
  })
  const { alert, confirm } = useDialog()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!selectedStreamId) {
      setSelectedStream(null)
      return
    }

    loadStreamDetails(selectedStreamId)
  }, [selectedStreamId])

  const streamOptions = useMemo(
    () => streams.map((stream) => ({
      ...stream,
      courseName: courses.find((course) => course.id === stream.course_id)?.name || 'Неизвестный курс',
    })),
    [courses, streams],
  )

  async function loadInitialData() {
    try {
      setLoading(true)
      const [streamsResponse, coursesResponse] = await Promise.all([
        streamsAPI.getAll(),
        coursesAPI.getAll(),
      ])
      setStreams(ensureArray(streamsResponse.data))
      setCourses(ensureArray(coursesResponse.data))
    } catch (error) {
      console.error('Ошибка загрузки данных для рассылок:', error)
      await alert('Не удалось загрузить потоки и курсы для рассылки.')
    } finally {
      setLoading(false)
    }
  }

  async function loadStreamDetails(streamId) {
    try {
      setDetailsLoading(true)
      const response = await streamsAPI.getById(streamId)
      const nextStream = {
        ...response.data,
        students: ensureArray(response.data?.students),
      }
      setSelectedStream(nextStream)
      setPreviewStudentId(nextStream.students[0]?.id || null)
    } catch (error) {
      console.error('Ошибка загрузки потока для рассылки:', error)
      setSelectedStream(null)
      setPreviewStudentId(null)
      await alert('Не удалось загрузить состав потока.')
    } finally {
      setDetailsLoading(false)
    }
  }

  function appendPlaceholder(placeholder) {
    setMessage((current) => `${current}${current.endsWith('\n') ? '' : '\n'}${placeholder}`)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!selectedStream) {
      await alert('Выберите поток для рассылки.')
      return
    }

    if (!subject.trim() || !message.trim()) {
      await alert('Заполните тему и текст письма.')
      return
    }

    const recipientCount = selectedStream.students?.length || 0
    if (!recipientCount) {
      await alert('В выбранном потоке нет студентов для рассылки.')
      return
    }

    const shouldSend = await confirm(
      `Отправить письмо ${recipientCount} получателям потока "${selectedStream.name}"?`,
      'Отправить рассылку',
    )
    if (!shouldSend) {
      return
    }

    try {
      setSending(true)
      setStatusModal({
        status: 'sending',
        result: null,
        errorMessage: '',
      })
      const response = await mailingsAPI.sendStreamMailing({
        stream_id: selectedStream.id,
        subject: subject.trim(),
        message: message.trim(),
      })

      const result = response.data
      setStatusModal({
        status: result.failed_count > 0 || result.skipped_count > 0 ? 'partial' : 'success',
        result,
        errorMessage: '',
      })
    } catch (error) {
      console.error('Ошибка отправки рассылки:', error)
      const detail = error.response?.data?.detail
      setStatusModal({
        status: 'error',
        result: null,
        errorMessage: detail || 'Не удалось отправить рассылку.',
      })
    } finally {
      setSending(false)
    }
  }

  const previewStudent = selectedStream?.students?.find((student) => student.id === previewStudentId)
    || selectedStream?.students?.[0]
    || null

  const previewContext = previewStudent && selectedStream
    ? {
        student_name: previewStudent.full_name,
        stream_name: selectedStream.name,
        course_name: streamOptions.find((stream) => stream.id === selectedStream.id)?.courseName || '',
        school_name: previewStudent.school_name,
        parent_name: previewStudent.parent_name,
      }
    : null

  const previewSubject = previewContext ? renderTemplate(subject, previewContext) : ''
  const previewMessage = previewContext ? renderTemplate(message, previewContext) : ''

  if (loading) {
    return <div className="container">Загрузка...</div>
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>Email-рассылки</h2>
          <p className="page-subtitle">
            Отправка персонализированных писем всем студентам выбранного потока через SMTP.
          </p>
        </div>
      </div>

      <div className="mailings-layout">
        <form className="card mailing-form-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="stream">Поток</label>
            <select
              id="stream"
              value={selectedStreamId}
              onChange={(event) => setSelectedStreamId(event.target.value)}
              disabled={sending}
            >
              <option value="">Выберите поток</option>
              {streamOptions.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.name} · {stream.courseName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Тема письма</label>
            <input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Например: Напоминание по потоку {{stream_name}}"
              disabled={sending}
            />
            <div className="mailing-field-hint">
              Здесь редактируется шаблон. Персональные значения подставляются ниже в предпросмотре и при отправке.
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message">Текст письма</label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mailing-textarea"
              placeholder="Введите текст письма"
              disabled={sending}
            />
          </div>

          <div className="mailing-placeholders">
            <span>Подстановки:</span>
            <div className="mailing-placeholder-list">
              {PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  className="mailing-placeholder-chip"
                  onClick={() => appendPlaceholder(placeholder)}
                  disabled={sending}
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={sending || detailsLoading}>
              {sending ? 'Отправка...' : 'Отправить рассылку'}
            </button>
          </div>
        </form>

        <div className="card mailing-preview-card">
          <h3>Получатели и предпросмотр</h3>
          {detailsLoading ? (
            <p>Загрузка состава потока...</p>
          ) : !selectedStream ? (
            <p>Выберите поток, чтобы увидеть список получателей.</p>
          ) : (
            <>
              <div className="mailing-meta">
                <div><strong>Поток:</strong> {selectedStream.name}</div>
                <div><strong>Старт:</strong> {formatDate(selectedStream.start_date)}</div>
                <div><strong>Получателей:</strong> {selectedStream.students?.length || 0}</div>
              </div>

              {selectedStream.students?.length ? (
                <>
                  <div className="mailing-preview-box">
                    <div className="mailing-preview-header">
                      <strong>
                        Предпросмотр для: {previewStudent?.full_name || 'не выбран'}
                      </strong>
                    </div>
                    <div className="mailing-preview-subject">
                      <strong>Тема:</strong> {previewSubject || 'Нет данных для предпросмотра'}
                    </div>
                    <div className="mailing-preview-message">
                      {previewMessage || 'Нет данных для предпросмотра'}
                    </div>
                  </div>

                  <div className="mailing-recipient-list">
                    {selectedStream.students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        className={`mailing-recipient-item${previewStudent?.id === student.id ? ' is-active' : ''}`}
                        onClick={() => setPreviewStudentId(student.id)}
                      >
                      <strong>{student.full_name}</strong>
                      <span>{student.email}</span>
                      <span>{student.school_name}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p>В этом потоке пока нет студентов.</p>
              )}
            </>
          )}
        </div>
      </div>

      <MailingStatusModal
        status={statusModal.status}
        result={statusModal.result}
        errorMessage={statusModal.errorMessage}
        onClose={() => setStatusModal({ status: 'idle', result: null, errorMessage: '' })}
      />
    </div>
  )
}

export default EmailMailings
