import React, { useEffect, useState } from 'react';

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value) => {
    const hex = Math.round((value + m) * 255).toString(16);
    return hex.padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const defaultStudents = Array.from({ length: 25 }, (_, i) => ({
  id: `STUDENT_ID_${i + 1}`,
  name: `Student ${i + 1}`,
  color: hslToHex((i * 28) % 360, 78, 56),
}));

function formatDuration(totalSeconds) {
  if (totalSeconds == null) return null;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTextColor(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#162447' : '#fff';
}

const monochromeColors = ['#0f172a', '#1e293b', '#2d3748', '#334155', '#475569'];

function formatTotalDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState(defaultStudents);
  const [breakStatus, setBreakStatus] = useState({});
  const [breakHistory, setBreakHistory] = useState([]);
  const [activeTimerStudent, setActiveTimerStudent] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [openPickerId, setOpenPickerId] = useState(null);

  useEffect(() => {
    if (window.butter?.init) {
      window.butter.init({ cancelOnTouch: true });
    }
  }, []);

  useEffect(() => {
    const storedStudents = localStorage.getItem('restroomFlowStudents');
    if (storedStudents) {
      try {
        const parsed = JSON.parse(storedStudents);
        if (Array.isArray(parsed) && parsed.length) {
          setStudents(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved students', error);
      }
    }

    const storedBreakStatus = localStorage.getItem('restroomFlowBreakStatus');
    if (storedBreakStatus) {
      try {
        const parsed = JSON.parse(storedBreakStatus);
        setBreakStatus(parsed || {});
      } catch (error) {
        console.error('Failed to parse saved break status', error);
      }
    }

    const storedHistory = localStorage.getItem('restroomFlowHistory');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setBreakHistory(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved history', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('restroomFlowStudents', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('restroomFlowBreakStatus', JSON.stringify(breakStatus));
  }, [breakStatus]);

  useEffect(() => {
    localStorage.setItem('restroomFlowHistory', JSON.stringify(breakHistory));
  }, [breakHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeTimerStudent) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimerStudent]);

  useEffect(() => {
    if (!toastVisible) return undefined;
    const timer = setTimeout(() => setToastVisible(false), 2200);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  const showCooldownToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const togglePicker = (studentId) => {
    setOpenPickerId((prev) => (prev === studentId ? null : studentId));
  };

  const updateStudent = (studentId, changes) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, ...changes } : student
      )
    );
  };

  const startBreak = async (student) => {
    const wentOutAt = Date.now();
    setActiveTimerStudent(student);
    setElapsedSeconds(0);
    setBreakStatus((prev) => ({
      ...prev,
      [student.id]: {
        ...prev[student.id],
        isOut: true,
        cooldownUntil: null,
        wentOutAt,
      },
    }));

    setBreakHistory((prev) => [
      {
        studentId: student.id,
        studentName: student.name,
        wentOutAt,
        durationSeconds: null,
        durationLabel: null,
        returnedAt: null,
      },
      ...prev,
    ]);

    try {
      const response = await fetch('http://localhost:5000/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, is_starting: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('API error:', data);
      }
    } catch (err) {
      console.error('API Error:', err);
    }
  };

  const endBreak = async () => {
    if (!activeTimerStudent) {
      return;
    }

    const student = activeTimerStudent;

    try {
      const response = await fetch('http://localhost:5000/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, is_starting: false }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error('API error:', data);
        return;
      }

      const durationLabel =
        data.data?.duration_human || formatDuration(elapsedSeconds);

      setBreakStatus((prev) => ({
        ...prev,
        [student.id]: {
          isOut: false,
          cooldownUntil: Date.now() + 5 * 60 * 1000,
        },
      }));

      setBreakHistory((prev) =>
        prev.map((entry) =>
          entry.studentId === student.id && !entry.returnedAt
            ? {
                ...entry,
                durationSeconds: elapsedSeconds,
                durationLabel,
                returnedAt: Date.now(),
              }
            : entry
        )
      );

      alert(`${student.name} returned after ${durationLabel}`);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setActiveTimerStudent(null);
      setElapsedSeconds(0);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentAction = (student, status, cooldownRemaining) => {
    const isCoolingDown = !status.isOut && cooldownRemaining > 0;
    if (status.isOut) {
      setActiveTimerStudent(student);
      return;
    }

    if (isCoolingDown) {
      showCooldownToast(
        `${student.name} already returned — ready in ${formatDuration(cooldownRemaining)}`
      );
      return;
    }

    startBreak(student);
  };

  if (activeTimerStudent) {
    return (
      <div className="app-shell">
        <div className="app-card">
          <div className="header-row">
            <div>
              <h1>{activeTimerStudent.name}</h1>
              <p>Bathroom break timer running...</p>
            </div>
          </div>

          <div className="search-container">
            <div
              className="student-card"
              style={{ justifyContent: 'center', gap: '16px' }}
            >
              <span className="student-name">Elapsed time</span>
              <span
                className="status-label"
                style={{ fontSize: '1.8rem', color: '#162447' }}
              >
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <button className="action-button out" onClick={endBreak}>
              Return to class
            </button>
          </div>

          <p className="footer-note">
            Press return when the student is back and the timer will close.
          </p>
          <div className="credits">Created by Vincent Sapp ©</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="header-row">
          <div>
            <h1>Restroom Flow</h1>
            <p>Track student bathroom breaks with duration reporting.</p>
            <p>Made for my Coding Practicum Capstone Project!</p>
          </div>
        </div>

        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="app-layout">
          <div className="main-column">
            <div className="student-list">
          {filteredStudents.map((student) => {
            const status = breakStatus[student.id] || {
              isOut: false,
              cooldownUntil: null,
            };
            const cooldownRemaining = status.cooldownUntil
              ? Math.max(0, Math.ceil((status.cooldownUntil - currentTime) / 1000))
              : 0;
            const isCoolingDown = !status.isOut && cooldownRemaining > 0;
            const buttonText = isCoolingDown
              ? 'Returned'
              : 'Go to Bathroom';
            const buttonClass = isCoolingDown ? 'returned' : 'in';

            return (
              <div
                key={student.id}
                className={`student-card ${status.isOut ? 'out' : ''}`}
                style={{ borderLeft: `6px solid ${student.color}` }}
              >
                <div className="student-meta">
                  <div className="student-top-row">
                    <input
                      className="student-name-input"
                      value={student.name}
                      onChange={(e) => updateStudent(student.id, { name: e.target.value })}
                      aria-label={`Student name for ${student.id}`}
                      style={{
                        backgroundColor: student.color,
                        color: getTextColor(student.color),
                      }}
                    />
                    <div className="student-color-picker">
                      <button
                        className="student-color-square"
                        type="button"
                        style={{ backgroundColor: student.color }}
                        onClick={() => togglePicker(student.id)}
                        aria-label={`Choose color for ${student.name}`}
                      />
                      {openPickerId === student.id ? (
                        <div className="color-picker-popover">
                          <div className="color-range-row">
                            <input
                              className="color-range"
                              type="range"
                              min="0"
                              max="4"
                              step="1"
                              value={Math.max(
                                0,
                                monochromeColors.indexOf(student.color)
                              )}
                              onChange={(e) =>
                                updateStudent(student.id, {
                                  color: monochromeColors[Number(e.target.value)],
                                })
                              }
                            />
                            <div className="color-choice-row">
                              {monochromeColors.map((colorChoice, index) => (
                                <button
                                  key={colorChoice}
                                  type="button"
                                  className={`color-choice ${
                                    colorChoice === student.color ? 'active' : ''
                                  }`}
                                  style={{ backgroundColor: colorChoice }}
                                  onClick={() =>
                                    updateStudent(student.id, { color: colorChoice })
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="student-meta-row">
                    {isCoolingDown ? (
                      <span className="status-label returned-text">
                        Returned — ready in {formatDuration(cooldownRemaining)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  className={`action-button ${buttonClass}`}
                  onClick={() => handleStudentAction(student, status, cooldownRemaining)}
                  type="button"
                >
                  {buttonText}
                </button>
              </div>
            );
          })}
            </div>
          </div>
          <aside className="history-panel">
            <div className="history-header">
              <h2>Bathroom History</h2>
              <p className="history-summary">
                {breakHistory.filter((h) => h.returnedAt).length} visits ·{' '}
                {formatTotalDuration(
                  breakHistory.reduce(
                    (sum, h) => sum + (h.durationSeconds || 0),
                    0
                  )
                )}
              </p>
            </div>
            <div className="history-list">
              {breakHistory.length ? (
                breakHistory.slice(0, 8).map((entry, index) => {
                  const isActive = !entry.returnedAt;
                  const displayDuration = isActive
                    ? formatDuration(
                        Math.floor((currentTime - entry.wentOutAt) / 1000)
                      )
                    : entry.durationLabel;
                  const statusText = isActive
                    ? `Currently outside for ${displayDuration}`
                    : `Outside for ${displayDuration}`;
                  return (
                    <div
                      key={`${entry.studentId}-${entry.wentOutAt}-${index}`}
                      className={`history-item ${isActive ? 'active' : ''}`}
                    >
                      <div className="history-name">{entry.studentName}</div>
                      <div className="history-details">
                        <span>{statusText}</span>
                        <span>
                          {new Date(entry.wentOutAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="history-empty">No bathroom history yet.</p>
              )}
            </div>
          </aside>
        </div>

        <p className="footer-note">
          Note: I need to make my backend track the duration of breaks and return that info in the API response for this to work properly.
        </p>
        <div className="credits">Created by Vincent Sapp ©</div>
      </div>
      {toastVisible ? (
        <div className="toast-message">{toastMessage}</div>
      ) : null}
    </div>
  );
}

export default App;
