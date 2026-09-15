import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every outgoing request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message;
    console.error('[API Error]', msg);
    return Promise.reject(err);
  }
);

/* ── Auth ─────────────────────────────────────── */
export const validateRole = (role) => api.post('/auth/validate-role', { role });

/* ── Users ────────────────────────────────────── */
export const createStudentsFromCSV = (csvData) =>
  api.post('/users/create-students', { csv_data: csvData });
export const createRecruiter = (data) => api.post('/users/create-recruiter', data);
export const getStudentProfile = (uid) => api.get(`/users/student/${uid}`);
export const updateStudentProfile = (uid, data) => api.put(`/users/student/${uid}`, data);
export const listStudents = (params) => api.get('/users/students', { params });

/* ── Drives ───────────────────────────────────── */
export const createDrive = (data) => api.post('/drives', data);
export const listDrives = (params) => api.get('/drives', { params });
export const getDrive = (id) => api.get(`/drives/${id}`);
export const updateDrive = (id, data) => api.put(`/drives/${id}`, data);
export const applyToDrive = (driveId) => api.post(`/drives/${driveId}/apply`);

/* ── Exams ────────────────────────────────────── */
export const startExam = (data) => api.post('/exams/start', data);
export const submitExam = (data) => api.post('/exams/submit', data);
export const getExamQuestions = (params) => api.get('/exams/questions', { params });
export const getExamResults = (examId) => api.get(`/exams/results/${examId}`);

/* ── Code Execution ───────────────────────────── */
export const executeCode = (data) => api.post('/execute', data);

/* ── Interviews ───────────────────────────────── */
export const createInterview = (data) => api.post('/interviews', data);
export const getInterview = (id) => api.get(`/interviews/${id}`);
export const submitRubric = (id, data) => api.post(`/interviews/${id}/rubric`, data);

/* ── Blockchain ───────────────────────────────── */
export const mintPassport = (data) => api.post('/blockchain/mint', data);
export const verifyPassport = (tokenId) => api.get(`/blockchain/verify/${tokenId}`);

/* ── Analytics ────────────────────────────────── */
export const getAnalyticsSummary = () => api.get('/analytics/summary');
export const getDepartmentStats = () => api.get('/analytics/departments');
export const getPlacementTrends = () => api.get('/analytics/trends');
export const getSimulatorData = (params) => api.get('/analytics/simulator', { params });

export default api;
