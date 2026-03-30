import React, { useState, useEffect } from 'react'
import { studentsAPI, importAPI, communicationAPI } from '../api/api'
import StudentModal from '../components/StudentModal'
import StudentCard from '../components/StudentCard'
import { useDialog } from '../components/DialogProvider'

function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { alert, confirm } = useDialog()

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const response = await studentsAPI.getAll()
      setStudents(response.data)
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error)
      console.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.trim()) {
      try {
        const response = await studentsAPI.search(query)
        setStudents(response.data)
      } catch (error) {
        console.error('Ошибка поиска:', error)
      }
    } else {
      loadStudents()
    }
  }

  const handleCreate = () => {
    setEditingStudent(null)
    setShowModal(true)
  }

  const handleEdit = (student) => {
    setEditingStudent(student)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Вы уверены, что хотите удалить этого студента?'))) {
      return
    }

    try {
      await studentsAPI.delete(id)
      loadStudents()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      console.error('Ошибка удаления студента')
    }
  }

  const handleSave = () => {
    setShowModal(false)
    setEditingStudent(null)
    loadStudents()
  }

  const handleFileImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      await alert('Пожалуйста, выберите файл Excel (.xlsx или .xls)')
      return
    }

    try {
      const response = await importAPI.importStudents(file)
      if (response.data.errors && response.data.errors.length > 0) {
        await alert(`Импортировано: ${response.data.imported?.length || 0}. Ошибок: ${response.data.errors.length}`)
        console.error('Ошибки импорта:', response.data.errors)
      } else {
        await alert(`Успешно импортировано ${response.data.length} студентов`)
      }
      loadStudents()
    } catch (error) {
      console.error('Ошибка импорта:', error)
      console.error('Ошибка импорта файла')
    }
    
    e.target.value = ''
  }

  if (loading) {
    return <div className="container">Загрузка...</div>
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Студенты</h2>
        <div className="actions">
          <label className="btn btn-secondary">
            Импорт из Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </label>
          <button className="btn btn-primary" onClick={handleCreate}>
            Добавить студента
          </button>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Поиск по имени, email или школе..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ maxWidth: '400px' }}
        />
      </div>

      {selectedStudent ? (
        <StudentCard
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      ) : (
        <table>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Школа</th>
              <th>Желаемый курс</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  Нет данных
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.full_name}</td>
                  <td>{student.email}</td>
                  <td>{student.phone}</td>
                  <td>{student.school_name}</td>
                  <td>{student.desired_course_name || '-'}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => setSelectedStudent(student)}
                      >
                        Просмотр
                      </button>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => handleEdit(student)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(student.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <StudentModal
          student={editingStudent}
          onClose={() => {
            setShowModal(false)
            setEditingStudent(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Students
