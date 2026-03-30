import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set')
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const studentsAPI = {
  getAll: () => api.get('/students/'),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students/', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  search: (query) => api.get(`/students/search/${query}`),
}

export const coursesAPI = {
  getAll: () => api.get('/courses/'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses/', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
}

export const streamsAPI = {
  getAll: () => api.get('/streams/'),
  getByCourse: (courseId) => api.get(`/streams/course/${courseId}`),
  getById: (id) => api.get(`/streams/${id}`),
  create: (data) => api.post('/streams/', data),
  update: (id, data) => api.put(`/streams/${id}`, data),
  delete: (id) => api.delete(`/streams/${id}`),
  enroll: (studentId, streamId) => api.post('/streams/enroll', { student_id: studentId, stream_id: streamId }),
  unenroll: (studentId, streamId) => api.post('/streams/unenroll', { student_id: studentId, stream_id: streamId }),
}

export const importAPI = {
  importStudents: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import/students', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export const communicationAPI = {
  getContactInfo: (studentId) => api.get(`/communication/student/${studentId}/contact-info`),
  getEmailLink: (studentId) => api.get(`/communication/student/${studentId}/email-link`),
  getPhoneLink: (studentId, contactType = 'student') => 
    api.get(`/communication/student/${studentId}/phone-link?contact_type=${contactType}`),
}

export const documentsAPI = {
  generateEnrollmentOrder: (data) => 
    api.post('/documents/enrollment-order', data, { responseType: 'blob' }),
  generateUnenrollmentOrder: (data) => 
    api.post('/documents/unenrollment-order', data, { responseType: 'blob' }),
  generatePaymentMemo: (data) => 
    api.post('/documents/payment-memo', data, { responseType: 'blob' }),
  generateAccessPass: (data) => 
    api.post('/documents/access-pass', data, { responseType: 'blob' }),
}

export const mailingsAPI = {
  sendStreamMailing: (data) => api.post('/mailings/stream', data),
}

export default api
