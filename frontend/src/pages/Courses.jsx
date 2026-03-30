import React, { useState, useEffect } from 'react'
import { coursesAPI } from '../api/api'
import CourseModal from '../components/CourseModal'
import { Link } from 'react-router-dom'
import { useDialog } from '../components/DialogProvider'
import { ensureArray } from '../utils/ensureArray'

function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const { confirm } = useDialog()

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const response = await coursesAPI.getAll()
      setCourses(ensureArray(response.data))
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error)
      console.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCourse(null)
    setShowModal(true)
  }

  const handleEdit = (course) => {
    setEditingCourse(course)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Вы уверены, что хотите удалить этот курс? Все потоки также будут удалены.'))) {
      return
    }

    try {
      await coursesAPI.delete(id)
      loadCourses()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      console.error('Ошибка удаления курса')
    }
  }

  const handleSave = () => {
    setShowModal(false)
    setEditingCourse(null)
    loadCourses()
  }

  if (loading) {
    return <div className="container">Загрузка...</div>
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Курсы</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          Добавить курс
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Описание</th>
            <th>Потоков</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                Нет данных
              </td>
            </tr>
          ) : (
            courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <Link to={`/courses/${course.id}`} style={{ color: '#007bff', textDecoration: 'none' }}>
                    {course.name}
                  </Link>
                </td>
                <td>{course.description || '-'}</td>
                <td>
                  <span className="badge badge-primary">
                    {typeof course.stream_count === 'number'
                      ? course.stream_count
                      : (course.streams ? course.streams.length : 0)}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(course)}
                    >
                      Редактировать
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(course.id)}
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

      {showModal && (
        <CourseModal
          course={editingCourse}
          onClose={() => {
            setShowModal(false)
            setEditingCourse(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Courses
