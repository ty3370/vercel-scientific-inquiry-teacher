'use client';

import { useEffect, useMemo, useState } from 'react';

const STEP_LABELS = {
  1: '로그인',
  2: '1차 설계',
  3: 'AI 대화',
  4: '2차 설계',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ko-KR');
}

function getChat(student) {
  return Array.isArray(student?.chat_messages) ? student.chat_messages : [];
}

function getChecklist(student) {
  return Array.isArray(student?.evaluation_details?.checklist)
    ? student.evaluation_details.checklist
    : [];
}

export default function TeacherPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_students' })
      });

      const data = await res.json();

      if (res.status === 401) {
        setAuthenticated(false);
        setStudents([]);
        setSelectedStudent(null);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || '학생 목록을 불러오지 못했습니다.');
      }

      setStudents(data.students || []);

      if (selectedStudent) {
        const stillExists = (data.students || []).some(
          student =>
            student.number === selectedStudent.number &&
            student.name === selectedStudent.name &&
            student.code === selectedStudent.code
        );

        if (!stillExists) {
          setSelectedStudent(null);
        }
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadStudents();
    }
  }, [authenticated]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setLoginError('비밀번호를 입력해 주세요.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      setAuthenticated(true);
      setPassword('');
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });

    setAuthenticated(false);
    setStudents([]);
    setSelectedStudent(null);
  };

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return students;

    return students.filter(student =>
      String(student.number || '').toLowerCase().includes(keyword) ||
      String(student.name || '').toLowerCase().includes(keyword) ||
      String(student.code || '').toLowerCase().includes(keyword)
    );
  }, [students, search]);

  const handleSelectStudent = async student => {
    setSelectedStudent(null);
    setDetailLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_student',
          number: student.number,
          name: student.name,
          code: student.code
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || '학생 기록을 불러오지 못했습니다.'
        );
      }

      setSelectedStudent(data.student);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    const confirmed = window.confirm(
      `${selectedStudent.number} ${selectedStudent.name} 학생의 전체 탐구 기록을 삭제하시겠습니까?\n\n삭제하면 복구할 수 없습니다.`
    );

    if (!confirmed) return;

    try {
      const res = await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_student',
          number: selectedStudent.number,
          name: selectedStudent.name,
          code: selectedStudent.code
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      setSelectedStudent(null);
      setMessage('학생 기록이 삭제되었습니다.');
      await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!authenticated) {
    return (
      <main style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.icon}>🔬</div>

          <h1 style={styles.loginTitle}>
            AI-탐구 설계 도우미
          </h1>

          <p style={styles.loginSubtitle}>
            교사용 관리 페이지
          </p>

          <input
            type="password"
            placeholder="교사용 비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleLogin();
            }}
            style={styles.input}
          />

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={styles.primaryButton}
          >
            {loginLoading
              ? '확인 중...'
              : '교사용 페이지 열기'}
          </button>

          {loginError && (
            <p style={styles.errorText}>
              {loginError}
            </p>
          )}
        </div>
      </main>
    );
  }

  const chat = getChat(selectedStudent);
  const checklist = getChecklist(selectedStudent);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            👩‍🏫 AI-탐구 설계 도우미 · 교사용
          </h1>

          <p style={styles.subtitle}>
            학생의 탐구 설계, 채점 결과, AI 대화, 최종 설계서를 확인할 수 있습니다.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={loadStudents}
            style={styles.secondaryButton}
          >
            ↻ 새로고침
          </button>

          <button
            onClick={handleLogout}
            style={styles.secondaryButton}
          >
            로그아웃
          </button>
        </div>
      </header>

      {message && (
        <div style={styles.notice}>
          {message}
        </div>
      )}

      <section style={styles.workspace}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                학생 목록
              </h2>

              <span style={styles.count}>
                {students.length}명
              </span>
            </div>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="학번, 이름, 코드 검색"
            style={styles.searchInput}
          />

          <div style={styles.studentList}>
            {loading ? (
              <div style={styles.empty}>
                학생 목록을 불러오는 중입니다...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={styles.empty}>
                조건에 맞는 학생이 없습니다.
              </div>
            ) : (
              filteredStudents.map(student => {
                const isSelected =
                  selectedStudent &&
                  selectedStudent.number === student.number &&
                  selectedStudent.name === student.name &&
                  selectedStudent.code === student.code;

                return (
                  <button
                    key={`${student.number}-${student.name}-${student.code}`}
                    onClick={() =>
                      handleSelectStudent(student)
                    }
                    style={
                      isSelected
                        ? styles.studentCardSelected
                        : styles.studentCard
                    }
                  >
                    <div style={styles.studentTopLine}>
                      <strong>
                        {student.number}
                      </strong>

                      <span style={styles.stepBadge}>
                        {STEP_LABELS[student.current_step] ||
                          `단계 ${student.current_step || '-'}`}
                      </span>
                    </div>

                    <div style={styles.studentName}>
                      {student.name}
                    </div>

                    <div style={styles.studentMeta}>
                      총점 {student.total_score ?? '-'} / 15 ·{' '}
                      {formatDate(student.updated_at)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section style={styles.detailArea}>
          {detailLoading ? (
            <div style={styles.centerEmpty}>
              학생 기록을 불러오는 중입니다...
            </div>
          ) : !selectedStudent ? (
            <div style={styles.centerEmpty}>
              <div style={{ fontSize: 48 }}>
                📎
              </div>

              <h2 style={{ margin: '12px 0 6px' }}>
                학생을 선택하세요
              </h2>

              <p
                style={{
                  margin: 0,
                  color: '#94a3b8'
                }}
              >
                왼쪽 목록에서 학생을 선택하면 탐구 기록을 확인할 수 있습니다.
              </p>
            </div>
          ) : (
            <div style={styles.detailScroll}>
              <div style={styles.studentHeader}>
                <div>
                  <div style={styles.studentHeaderTitle}>
                    {selectedStudent.number} ·{' '}
                    {selectedStudent.name}
                  </div>

                  <div style={styles.studentHeaderMeta}>
                    식별코드: {selectedStudent.code} ·{' '}
                    마지막 저장:{' '}
                    {formatDate(selectedStudent.updated_at)}
                  </div>
                </div>

                <button
                  onClick={handleDelete}
                  style={styles.deleteButton}
                >
                  🗑 이 학생 기록 전체 삭제
                </button>
              </div>

              <section style={styles.infoGrid}>
                <div style={styles.infoCard}>
                  <div style={styles.cardLabel}>
                    현재 단계
                  </div>

                  <div style={styles.cardValue}>
                    {STEP_LABELS[selectedStudent.current_step] ||
                      `단계 ${selectedStudent.current_step || '-'}`}
                  </div>
                </div>

                <div style={styles.infoCard}>
                  <div style={styles.cardLabel}>
                    1차 설계 총점
                  </div>

                  <div style={styles.cardValue}>
                    {selectedStudent.total_score ?? '-'} / 15
                  </div>
                </div>
              </section>

              <section style={styles.card}>
                <h3 style={styles.cardTitle}>
                  📋 1차 탐구 설계
                </h3>

                <div style={styles.fieldLabel}>
                  실험 가설
                </div>

                <div style={styles.textBox}>
                  {selectedStudent.initial_hypothesis ||
                    '작성 내용이 없습니다.'}
                </div>

                <div style={styles.fieldLabel}>
                  실험 절차
                </div>

                <div style={styles.textBoxTall}>
                  {selectedStudent.initial_procedure ||
                    '작성 내용이 없습니다.'}
                </div>
              </section>

              <section style={styles.card}>
                <h3 style={styles.cardTitle}>
                  📊 15개 항목 채점 결과
                </h3>

                {checklist.length === 0 ? (
                  <div style={styles.empty}>
                    채점 결과가 없습니다.
                  </div>
                ) : (
                  <div
                    style={{
                      overflowX: 'auto'
                    }}
                  >
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>
                            번호
                          </th>
                          <th style={styles.th}>
                            구분
                          </th>
                          <th style={styles.th}>
                            항목
                          </th>
                          <th style={styles.th}>
                            점수
                          </th>
                          <th style={styles.th}>
                            이유
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {checklist.map(item => (
                          <tr key={item.id}>
                            <td style={styles.td}>
                              {item.id}
                            </td>

                            <td style={styles.td}>
                              {item.category}
                            </td>

                            <td style={styles.td}>
                              {item.item}
                            </td>

                            <td style={styles.td}>
                              <span
                                style={
                                  item.score === 1
                                    ? styles.goodBadge
                                    : styles.badBadge
                                }
                              >
                                {item.score}
                              </span>
                            </td>

                            <td style={styles.td}>
                              {item.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section style={styles.card}>
                <h3 style={styles.cardTitle}>
                  💬 AI 대화 기록
                </h3>

                {chat.length === 0 ? (
                  <div style={styles.empty}>
                    대화 기록이 없습니다.
                  </div>
                ) : (
                  <div style={styles.chatBox}>
                    {chat.map((item, index) => (
                      <div
                        key={`${index}-${item.role}`}
                        style={
                          item.role === 'user'
                            ? styles.chatUser
                            : styles.chatAssistant
                        }
                      >
                        <div style={styles.chatRole}>
                          {item.role === 'user'
                            ? selectedStudent.name
                            : '🤖 과학탐구 도우미'}
                        </div>

                        <div style={styles.chatContent}>
                          {item.content}
                        </div>

                        {item.timestamp && (
                          <div style={styles.chatTime}>
                            {item.timestamp}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={styles.card}>
                <h3 style={styles.cardTitle}>
                  📝 AI 대화 요약
                </h3>

                <div style={styles.textBoxTall}>
                  {selectedStudent.ai_summary ||
                    '아직 생성된 요약이 없습니다.'}
                </div>
              </section>

              <section style={styles.card}>
                <h3 style={styles.cardTitle}>
                  ✨ 2차 탐구 설계서
                </h3>

                <div style={styles.fieldLabel}>
                  수정된 2차 가설
                </div>

                <div style={styles.textBox}>
                  {selectedStudent.revised_hypothesis ||
                    '아직 작성되지 않았습니다.'}
                </div>

                <div style={styles.fieldLabel}>
                  수정된 2차 실험 절차
                </div>

                <div style={styles.textBoxTall}>
                  {selectedStudent.revised_procedure ||
                    '아직 작성되지 않았습니다.'}
                </div>
              </section>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const styles = {
  loginPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box'
  },

  loginCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 24,
    padding: 40,
    boxSizing: 'border-box',
    textAlign: 'center'
  },

  icon: {
    fontSize: 52
  },

  loginTitle: {
    color: '#f8fafc',
    fontSize: 25,
    margin: '14px 0 6px'
  },

  loginSubtitle: {
    color: '#94a3b8',
    margin: '0 0 26px'
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 14,
    borderRadius: 12,
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: 15,
    marginBottom: 12
  },

  primaryButton: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 15
  },

  errorText: {
    color: '#fca5a5',
    marginTop: 14
  },

  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: 24,
    boxSizing: 'border-box'
  },

  header: {
    maxWidth: 1500,
    margin: '0 auto 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16
  },

  title: {
    margin: 0,
    fontSize: 25
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#94a3b8',
    fontSize: 14
  },

  headerActions: {
    display: 'flex',
    gap: 8
  },

  secondaryButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #475569',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    cursor: 'pointer'
  },

  notice: {
    maxWidth: 1500,
    margin: '0 auto 12px',
    backgroundColor: '#132e4f',
    border: '1px solid #1d4ed8',
    color: '#bfdbfe',
    padding: '10px 14px',
    borderRadius: 10
  },

  workspace: {
    maxWidth: 1500,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '340px minmax(0, 1fr)',
    gap: 16,
    minHeight: 'calc(100vh - 130px)'
  },

  sidebar: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 20,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },

  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },

  sectionTitle: {
    margin: 0,
    fontSize: 18
  },

  count: {
    color: '#94a3b8',
    fontSize: 13
  },

  searchInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fff',
    marginBottom: 12
  },

  studentList: {
    overflowY: 'auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  studentCard: {
    width: '100%',
    textAlign: 'left',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 12,
    cursor: 'pointer'
  },

  studentCardSelected: {
    width: '100%',
    textAlign: 'left',
    backgroundColor: '#172554',
    color: '#fff',
    border: '1px solid #3b82f6',
    borderRadius: 12,
    padding: 12,
    cursor: 'pointer'
  },

  studentTopLine: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center'
  },

  studentName: {
    marginTop: 6,
    fontWeight: 700
  },

  studentMeta: {
    marginTop: 6,
    color: '#94a3b8',
    fontSize: 12
  },

  stepBadge: {
    display: 'inline-flex',
    padding: '3px 7px',
    borderRadius: 999,
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: 11
  },

  detailArea: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 20,
    minWidth: 0,
    minHeight: 0
  },

  detailScroll: {
    height: 'calc(100vh - 130px)',
    overflowY: 'auto',
    padding: 20,
    boxSizing: 'border-box'
  },

  centerEmpty: {
    minHeight: 500,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#cbd5e1',
    textAlign: 'center'
  },

  studentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16
  },

  studentHeaderTitle: {
    fontSize: 22,
    fontWeight: 800
  },

  studentHeaderMeta: {
    marginTop: 5,
    color: '#94a3b8',
    fontSize: 13
  },

  deleteButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #7f1d1d',
    backgroundColor: '#450a0a',
    color: '#fecaca',
    fontWeight: 700,
    cursor: 'pointer'
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 12
  },

  infoCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 14,
    padding: 16
  },

  cardLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6
  },

  cardValue: {
    fontSize: 21,
    fontWeight: 800
  },

  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12
  },

  cardTitle: {
    margin: '0 0 16px',
    fontSize: 17,
    color: '#38bdf8'
  },

  fieldLabel: {
    fontWeight: 700,
    margin: '14px 0 8px'
  },

  textBox: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: 14,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.7,
    color: '#e5e7eb',
    minHeight: 60,
    boxSizing: 'border-box'
  },

  textBoxTall: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: 14,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.7,
    color: '#e5e7eb',
    minHeight: 100,
    boxSizing: 'border-box'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13
  },

  th: {
    textAlign: 'left',
    padding: 9,
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    color: '#cbd5e1'
  },

  td: {
    padding: 9,
    borderBottom: '1px solid #1f2937',
    verticalAlign: 'top',
    color: '#e5e7eb',
    whiteSpace: 'pre-wrap'
  },

  goodBadge: {
    display: 'inline-block',
    minWidth: 24,
    textAlign: 'center',
    padding: '3px 6px',
    borderRadius: 999,
    backgroundColor: '#064e3b',
    color: '#6ee7b7'
  },

  badBadge: {
    display: 'inline-block',
    minWidth: 24,
    textAlign: 'center',
    padding: '3px 6px',
    borderRadius: 999,
    backgroundColor: '#450a0a',
    color: '#fca5a5'
  },

  chatBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 650,
    overflowY: 'auto',
    paddingRight: 4
  },

  chatUser: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    padding: '11px 13px'
  },

  chatAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    backgroundColor: '#334155',
    borderRadius: 14,
    padding: '11px 13px'
  },

  chatRole: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 5,
    opacity: 0.85
  },

  chatContent: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    fontSize: 14
  },

  chatTime: {
    fontSize: 10,
    marginTop: 6,
    opacity: 0.65
  },

  empty: {
    color: '#94a3b8',
    padding: '18px 4px'
  }
};
