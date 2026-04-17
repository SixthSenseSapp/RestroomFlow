import React, { useEffect, useState } from 'react';

const testStudents = Array.from({ length: 25 }, (_, i) => ({
  id: `STUDENT_ID_${i + 1}`,
  name: `Student ${i + 1}`,
}));

function formatDuration(totalSeconds) {
  if (totalSeconds == null) return null;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [breakStatus, setBreakStatus] = useState({});
  const [activeTimerStudent, setActiveTimerStudent] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (window.butter?.init) {
      window.butter.init({ cancelOnTouch: true });
    }
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

  const startBreak = async (student) => {
    setActiveTimerStudent(student);
    setElapsedSeconds(0);
    setBreakStatus((prev) => ({
      ...prev,
      [student.id]: {
        ...prev[student.id],
        isOut: true,
        lastDuration: prev[student.id]?.lastDuration ?? null,
      },
    }));

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

      setBreakStatus((prev) => ({
        ...prev,
        [student.id]: {
          isOut: false,
          lastDuration: data.data.duration_human,
        },
      }));

      alert(`${student.name} returned after ${data.data.duration_human || formatDuration(elapsedSeconds)}`);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setActiveTimerStudent(null);
      setElapsedSeconds(0);
    }
  };

  const filteredStudents = testStudents.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="student-card" style={{ justifyContent: 'center', gap: '16px' }}>
              <span className="student-name">Elapsed time</span>
              <span className="status-label" style={{ fontSize: '1.8rem', color: '#162447' }}>
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

        <div className="student-list">
          {filteredStudents.map((student) => {
            const status = breakStatus[student.id] || { isOut: false, lastDuration: null };
            return (
              <div key={student.id} className={`student-card ${status.isOut ? 'out' : ''}`}>
                <div className="student-meta">
                  <span className="student-name">
                    {student.name} {status.isOut ? '(OUT)' : ''}
                  </span>
                  {status.lastDuration && !status.isOut ? (
                    <span className="status-label">Last break: {status.lastDuration}</span>
                  ) : null}
                </div>
                <button
                  className={`action-button ${status.isOut ? 'out' : 'in'}`}
                  onClick={() => (status.isOut ? endBreak() : startBreak(student))}
                >
                  {status.isOut ? 'Return' : 'Go to Bathroom'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="footer-note">
          Note: I need to make my backend track the duration of breaks and return that info in the API response for this to work properly.
        </p>
        <div className="credits">
          Created by Vincent Sapp ©
        </div>
      </div>
    </div>
  );
}

export default App;
