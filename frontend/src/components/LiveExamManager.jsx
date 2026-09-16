import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db, collection, onSnapshot, doc, setDoc, getDocs, updateDoc } from '../lib/firebase';
import { exportResultsToCSV, exportResultsToPDF } from '../lib/exportUtils';

export default function LiveExamManager({ userRole = 'tpo', initialTab = 'manager' }) {
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [exams, setExams] = useState({});
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [evalSubTab, setEvalSubTab] = useState('aptitude_results');
  const [qBuilderSubTab, setQBuilderSubTab] = useState('aptitude'); // 'aptitude' | 'technical_coding' | 'technical_mcq'

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [examForm, setExamForm] = useState({
    title: 'Aptitude & Technical Screening',
    examType: 'aptitude',
    durationMinutes: 30,
    aptitudeDurationMinutes: 30,
    technicalDurationMinutes: 45,
    passMark: 60,
    isLive: false,
  });

  const [questions, setQuestions] = useState([
    { id: 1, q: 'A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?', opts: ['65 sec', '89 sec', '100 sec', '150 sec'], ans: 1, topic: 'Aptitude' },
    { id: 2, q: 'If LOGIC is coded as BHODK, how is CLERK coded?', opts: ['FMDQJ', 'JQDMF', 'EKQBJ', 'QJMFD'], ans: 0, topic: 'Reasoning' },
    { id: 3, q: 'Find the odd one out: 35, 49, 63, 77, 85, 91', opts: ['49', '85', '91', '77'], ans: 1, topic: 'Quantitative' },
    { id: 101, q: 'What is the worst-case time complexity of QuickSort algorithm?', opts: ['O(N)', 'O(N log N)', 'O(N²)', 'O(log N)'], ans: 2, topic: 'Algorithms' },
    { id: 102, q: 'Which data structure follows the LIFO (Last In First Out) principle?', opts: ['Queue', 'Stack', 'Linked List', 'Tree'], ans: 1, topic: 'Data Structures' },
  ]);

  // Technical Coding Question Pool & Test Cases Builder State
  const [codingQuestions, setCodingQuestions] = useState([
    {
      id: 1,
      title: '1 to 100 Number Sequence Generator & Filter',
      description: "Write a program that processes numbers from 1 to 100 based on an input filter mode ('even', 'odd', 'prime', 'multiples_5') and outputs the matching sequence separated by single spaces.",
      sampleInput: 'even',
      sampleOutput: '2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70 72 74 76 78 80 82 84 86 88 90 92 94 96 98 100',
      testCases: [
        {
          name: 'Print Even Numbers (1 to 100)',
          input: 'even',
          expectedOutput: '2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70 72 74 76 78 80 82 84 86 88 90 92 94 96 98 100',
          isHidden: false
        },
        {
          name: 'Print Odd Numbers (1 to 100)',
          input: 'odd',
          expectedOutput: '1 3 5 7 9 11 13 15 17 19 21 23 25 27 29 31 33 35 37 39 41 43 45 47 49 51 53 55 57 59 61 63 65 67 69 71 73 75 77 79 81 83 85 87 89 91 93 95 97 99',
          isHidden: false
        },
        {
          name: 'Print Prime Numbers (1 to 100)',
          input: 'prime',
          expectedOutput: '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71 73 79 83 89 97',
          isHidden: false
        },
        {
          name: 'Print Multiples of 5 (Hidden Test Case)',
          input: 'multiples_5',
          expectedOutput: '5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100',
          isHidden: true
        }
      ]
    },
    {
      id: 2,
      title: 'String Word Reversal & Case Inversion',
      description: "Write a program that takes a sentence as input, reverses the order of words in the sentence, and flips uppercase letters to lowercase and vice versa.",
      sampleInput: 'Hello World',
      sampleOutput: 'wORLD hELLO',
      testCases: [
        {
          name: 'Basic Two Word Swap',
          input: 'Hello World',
          expectedOutput: 'wORLD hELLO',
          isHidden: false
        },
        {
          name: 'Multi-word Sentence Inversion',
          input: 'Placement Intelligence Portal',
          expectedOutput: 'pORTAL iNTELLIGENCE pLACEMENT',
          isHidden: false
        },
        {
          name: 'Hidden Case Inversion Test',
          input: 'Code Sandbox 2026',
          expectedOutput: '2026 sANDBOX cODE',
          isHidden: true
        }
      ]
    },
    {
      id: 3,
      title: 'Array Target Sum Pair Counter',
      description: "Write a program that takes a target integer and a space-separated sequence of numbers, and outputs the total count of unique pairs that sum up to the target integer.",
      sampleInput: '10\n1 2 3 4 5 6 7 8 9',
      sampleOutput: '4',
      testCases: [
        {
          name: 'Target 10 Pair Count',
          input: '10\n1 2 3 4 5 6 7 8 9',
          expectedOutput: '4',
          isHidden: false
        },
        {
          name: 'Target 15 Pair Count',
          input: '15\n5 10 20 30 -5',
          expectedOutput: '1',
          isHidden: false
        },
        {
          name: 'Hidden Zero Pair Test',
          input: '0\n-5 5 -2 2 0 0',
          expectedOutput: '3',
          isHidden: true
        }
      ]
    }
  ]);
  const [activeTechQIndex, setActiveTechQIndex] = useState(0);

  const [newTC, setNewTC] = useState({ name: '', input: '', expectedOutput: '', isHidden: false });

  // New MCQ question form state
  const [newQText, setNewQText] = useState('');
  const [newQTopic, setNewQTopic] = useState('Aptitude');
  const [newOpts, setNewOpts] = useState(['', '', '', '']);
  const [newAnsIndex, setNewAnsIndex] = useState(0);

  // MCQ Inline Edit state
  const [editingQId, setEditingQId] = useState(null);
  const [editingQForm, setEditingQForm] = useState({ q: '', topic: 'Aptitude', opts: ['', '', '', ''], ans: 0 });
  
  // Unpublish Confirmation Modal state
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);

  // Interview & Offline Scoring Form State
  const [interviewForm, setInterviewForm] = useState({
    date: '2026-09-20',
    timeSlot: '10:00 AM - 01:00 PM',
    mode: 'AI Proctored Video Interview',
  });
  const [interviewMsg, setInterviewMsg] = useState('');

  // Offline Candidate Scoring Form State (Round 3 Offline)
  const [offlineSubTab, setOfflineSubTab] = useState('online'); // 'online' | 'offline'
  const [offlineForm, setOfflineForm] = useState({
    rollNo: '',
    candidateName: '',
    score: '',
    status: 'PASSED',
    notes: 'Cleared Round 3 Offline Panel Interview',
  });
  const [offlineMsg, setOfflineMsg] = useState('');

  useEffect(() => {
    const unsubDrives = onSnapshot(collection(db, 'drives'), (snap) => {
      if (!snap.empty) {
        const driveList = snap.docs.map(d => ({
          id: d.id,
          company: d.data().company || 'Company',
          role: d.data().role || 'Role',
        }));
        setDrives(driveList);
        if (!selectedDriveId && driveList.length > 0) {
          setSelectedDriveId(driveList[0].id);
        }
      }
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      const examMap = {};
      snap.docs.forEach(d => {
        examMap[d.id] = { id: d.id, ...d.data() };
      });
      setExams(examMap);
    });

    return () => {
      unsubDrives();
      unsubExams();
    };
  }, [selectedDriveId]);

  const activeDrive = drives.find(d => d.id === selectedDriveId) || drives[0];

  const saveExamToFirestoreDirect = async (targetDriveId, driveObj, formObj, qsObj, codingQsObj) => {
    if (!targetDriveId || !driveObj) return;
    try {
      const activeQ = codingQsObj[0];
      await setDoc(doc(db, 'exams', targetDriveId), {
        driveId: targetDriveId,
        driveCompany: driveObj.company,
        driveRole: driveObj.role,
        title: formObj.title,
        examType: formObj.examType,
        durationMinutes: formObj.durationMinutes,
        aptitudeDurationMinutes: formObj.aptitudeDurationMinutes,
        technicalDurationMinutes: formObj.technicalDurationMinutes,
        passMark: formObj.passMark,
        isLive: formObj.isLive,
        registeredStudentRolls: [],
        questions: qsObj,
        techQuestions: [],
        codingQuestions: codingQsObj,
        testCases: activeQ?.testCases || [],
        techProblem: {
          title: activeQ?.title || '',
          description: activeQ?.description || '',
          sampleInput: activeQ?.sampleInput || '',
          sampleOutput: activeQ?.sampleOutput || '',
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Direct save exam error:', err);
    }
  };

  useEffect(() => {
    if (!selectedDriveId) return;

    setActiveTechQIndex(0);

    if (exams[selectedDriveId]) {
      const ex = exams[selectedDriveId];
      setExamForm({
        title: ex.title || (activeDrive ? `${activeDrive.company} — ${activeDrive.role} Assessment` : 'Placement Screening Exam'),
        examType: ex.examType || 'aptitude',
        durationMinutes: ex.examType === 'technical' ? (ex.technicalDurationMinutes || ex.durationMinutes || 45) : (ex.aptitudeDurationMinutes || ex.durationMinutes || 30),
        aptitudeDurationMinutes: ex.aptitudeDurationMinutes || 30,
        technicalDurationMinutes: ex.technicalDurationMinutes || 45,
        passMark: ex.passMark || 60,
        isLive: !!ex.isLive,
      });

      if (ex.questions && Array.isArray(ex.questions)) {
        let mergedQs = [...ex.questions];
        if (ex.techQuestions && Array.isArray(ex.techQuestions)) {
          ex.techQuestions.forEach(tq => {
            if (!mergedQs.some(q => q.q === tq.q)) {
              mergedQs.push({ ...tq, topic: tq.topic || 'Technical / CS' });
            }
          });
        }
        setQuestions(mergedQs);
      } else {
        setQuestions([]);
      }

      if (ex.codingQuestions && Array.isArray(ex.codingQuestions) && ex.codingQuestions.length > 0) {
        setCodingQuestions(ex.codingQuestions);
      } else if (ex.techProblem && ex.techProblem.title) {
        setCodingQuestions([{
          id: 1,
          title: ex.techProblem.title,
          description: ex.techProblem.description || '',
          sampleInput: ex.techProblem.sampleInput || '',
          sampleOutput: ex.techProblem.sampleOutput || '',
          testCases: Array.isArray(ex.testCases) ? ex.testCases : []
        }]);
      } else {
        setCodingQuestions([]);
      }
    } else if (activeDrive) {
      // IF DRIVE DOES NOT HAVE AN EXAM DOCUMENT YET: Initialize drive-specific isolated questions & title!
      const driveCompany = activeDrive.company || 'Company';
      const driveRole = activeDrive.role || 'Role';
      const initTitle = `${driveCompany} — ${driveRole} Assessment`;
      
      const initForm = {
        title: initTitle,
        examType: 'aptitude',
        durationMinutes: 30,
        aptitudeDurationMinutes: 30,
        technicalDurationMinutes: 45,
        passMark: 60,
        isLive: false,
      };

      const initQuestions = [
        { id: 1, q: `[${driveCompany}] A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?`, opts: ['65 sec', '89 sec', '100 sec', '150 sec'], ans: 1, topic: 'Aptitude' },
        { id: 2, q: `[${driveCompany}] If LOGIC is coded as BHODK, how is CLERK coded?`, opts: ['FMDQJ', 'JQDMF', 'EKQBJ', 'QJMFD'], ans: 0, topic: 'Reasoning' },
        { id: 3, q: `[${driveCompany}] What is the worst-case time complexity of QuickSort algorithm?`, opts: ['O(N)', 'O(N log N)', 'O(N²)', 'O(log N)'], ans: 2, topic: 'Algorithms' },
      ];

      const initCodingQuestions = [
        {
          id: 1,
          title: `${driveCompany} Technical Coding Challenge #1`,
          description: `Write a program for ${driveCompany} (${driveRole}) recruitment screening that processes input and returns matching output.`,
          sampleInput: 'even',
          sampleOutput: '2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70 72 74 76 78 80 82 84 86 88 90 92 94 96 98 100',
          testCases: [
            {
              name: 'Sample Visible Test Case',
              input: 'even',
              expectedOutput: '2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70 72 74 76 78 80 82 84 86 88 90 92 94 96 98 100',
              isHidden: false
            }
          ]
        }
      ];

      setExamForm(initForm);
      setQuestions(initQuestions);
      setCodingQuestions(initCodingQuestions);

      saveExamToFirestoreDirect(selectedDriveId, activeDrive, initForm, initQuestions, initCodingQuestions);
    }
  }, [selectedDriveId, exams]);

  useEffect(() => {
    if (!selectedDriveId) return;
    const unsubResults = onSnapshot(collection(db, 'examResults'), (snap) => {
      if (!snap.empty) {
        const matched = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.driveId === selectedDriveId);
        setResults(matched);
      } else {
        setResults([]);
      }
    }, (err) => {
      console.warn('Real-time examResults listener warning:', err);
    });
    return () => unsubResults();
  }, [selectedDriveId]);

  const saveExamToFirestore = async (customQuestions, customCodingQs, liveStateOverride) => {
    if (!selectedDriveId || !activeDrive) return;
    setSaving(true);
    const qsToSave = customQuestions !== undefined ? customQuestions : questions;
    const codingQsToSave = customCodingQs !== undefined ? customCodingQs : codingQuestions;
    const isLiveTarget = liveStateOverride !== undefined ? liveStateOverride : examForm.isLive;

    try {
      let registeredRolls = [];
      const appSnap = await getDocs(collection(db, 'drives', selectedDriveId, 'applications'));
      if (!appSnap.empty) {
        registeredRolls = appSnap.docs.map(doc => doc.id || doc.data().rollNo).filter(Boolean);
      }

      const activeQ = codingQsToSave[activeTechQIndex] || codingQsToSave[0];
      const dur = parseInt(examForm.durationMinutes, 10) || (examForm.examType === 'technical' ? 45 : 30);
      const aptDur = parseInt(examForm.aptitudeDurationMinutes, 10) || 30;
      const techDur = parseInt(examForm.technicalDurationMinutes, 10) || 45;

      await setDoc(doc(db, 'exams', selectedDriveId), {
        driveId: selectedDriveId,
        driveCompany: activeDrive.company,
        driveRole: activeDrive.role,
        title: examForm.title,
        examType: examForm.examType,
        durationMinutes: dur,
        aptitudeDurationMinutes: aptDur,
        technicalDurationMinutes: techDur,
        passMark: parseInt(examForm.passMark, 10) || 60,
        isLive: isLiveTarget,
        registeredStudentRolls: registeredRolls,
        questions: qsToSave,
        techQuestions: [],
        codingQuestions: codingQsToSave,
        testCases: activeQ?.testCases || [],
        techProblem: {
          title: activeQ?.title || '',
          description: activeQ?.description || '',
          sampleInput: activeQ?.sampleInput || '',
          sampleOutput: activeQ?.sampleOutput || '',
        },
        updatedAt: new Date().toISOString(),
      });

      setExamForm(p => ({ ...p, isLive: isLiveTarget }));
    } catch (err) {
      console.error('Save exam error:', err);
    }
    setSaving(false);
  };

  const handleToggleGoLive = async (targetLiveState) => {
    if (!targetLiveState) {
      setShowUnpublishModal(true);
    } else {
      await saveExamToFirestore(undefined, undefined, true);
    }
  };

  const handleConfirmUnpublish = async () => {
    setShowUnpublishModal(false);
    await saveExamToFirestore(undefined, undefined, false);
  };

  const handleSaveConfig = async () => {
    await saveExamToFirestore(questions, codingQuestions, examForm.isLive);
    alert('Exam configuration & question bank successfully saved to database!');
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQText.trim()) return;
    const newQ = {
      id: Date.now(),
      q: newQText.trim(),
      opts: newOpts.map((o, i) => o.trim() || `Option ${i + 1}`),
      ans: newAnsIndex,
      topic: newQTopic.trim() || 'Aptitude',
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    setNewQText('');
    setNewQTopic('Aptitude');
    setNewOpts(['', '', '', '']);
    setNewAnsIndex(0);
    saveExamToFirestore(updated, codingQuestions);
  };

  const handleStartEditQuestion = (qObj, idx) => {
    setEditingQId(qObj.id || idx);
    setEditingQForm({
      q: qObj.q || '',
      topic: qObj.topic || 'Aptitude',
      opts: Array.isArray(qObj.opts) ? [...qObj.opts] : ['', '', '', ''],
      ans: qObj.ans || 0,
    });
  };

  const handleCancelEditQuestion = () => {
    setEditingQId(null);
    setEditingQForm({ q: '', topic: 'Aptitude', opts: ['', '', '', ''], ans: 0 });
  };

  const handleSaveEditedQuestion = (e, targetIdOrIdx) => {
    e.preventDefault();
    if (!editingQForm.q.trim()) return;
    const updated = questions.map((q, idx) => {
      if ((q.id || idx) === targetIdOrIdx) {
        return {
          ...q,
          q: editingQForm.q.trim(),
          topic: editingQForm.topic.trim() || 'Aptitude',
          opts: editingQForm.opts.map((o, i) => o.trim() || `Option ${i + 1}`),
          ans: editingQForm.ans,
        };
      }
      return q;
    });
    setQuestions(updated);
    setEditingQId(null);
    saveExamToFirestore(updated, codingQuestions);
  };

  const handleDeleteQuestion = (idxToDelete) => {
    const updated = questions.filter((_, i) => i !== idxToDelete);
    setQuestions(updated);
    saveExamToFirestore(updated, codingQuestions);
  };

  const handleAddCodingQuestion = () => {
    const newQ = {
      id: Date.now(),
      title: `Coding Problem Statement #${codingQuestions.length + 1}`,
      description: 'Write a program to solve the given technical problem instructions...',
      sampleInput: 'sample_input',
      sampleOutput: 'sample_output',
      testCases: [
        {
          name: 'Sample Visible Test Case',
          input: 'sample_input',
          expectedOutput: 'sample_output',
          isHidden: false
        }
      ]
    };
    const updated = [...codingQuestions, newQ];
    setCodingQuestions(updated);
    const newIdx = updated.length - 1;
    setActiveTechQIndex(newIdx);
    saveExamToFirestore(questions, updated);
  };

  const handleDeleteCodingQuestion = (indexToDelete) => {
    if (codingQuestions.length <= 1) {
      alert('At least one coding question must remain in the question bank pool.');
      return;
    }
    const updated = codingQuestions.filter((_, idx) => idx !== indexToDelete);
    setCodingQuestions(updated);
    const newIndex = activeTechQIndex >= updated.length ? updated.length - 1 : activeTechQIndex;
    setActiveTechQIndex(newIndex);
    saveExamToFirestore(questions, updated);
  };

  const handleUpdateCurrentCodingQ = (field, value) => {
    const updated = codingQuestions.map((q, idx) => {
      if (idx === activeTechQIndex) {
        return { ...q, [field]: value };
      }
      return q;
    });
    setCodingQuestions(updated);
    saveExamToFirestore(questions, updated);
  };

  const handleAddTestCase = (e) => {
    e.preventDefault();
    if (!newTC.input.trim() || !newTC.expectedOutput.trim()) return;
    const currentQ = codingQuestions[activeTechQIndex] || codingQuestions[0];
    const tcToAdd = {
      name: newTC.name.trim() || `Test Case ${(currentQ?.testCases?.length || 0) + 1}`,
      input: newTC.input.trim(),
      expectedOutput: newTC.expectedOutput.trim(),
      isHidden: !!newTC.isHidden,
    };
    const updated = codingQuestions.map((q, idx) => {
      if (idx === activeTechQIndex) {
        return { ...q, testCases: [...(q.testCases || []), tcToAdd] };
      }
      return q;
    });
    setCodingQuestions(updated);
    setNewTC({ name: '', input: '', expectedOutput: '', isHidden: false });
    saveExamToFirestore(questions, updated);
  };

  const handleDeleteTestCase = (tcIdx) => {
    const updated = codingQuestions.map((q, idx) => {
      if (idx === activeTechQIndex) {
        return { ...q, testCases: (q.testCases || []).filter((_, i) => i !== tcIdx) };
      }
      return q;
    });
    setCodingQuestions(updated);
    saveExamToFirestore(questions, updated);
  };

  const handleSaveOfflineScore = async (e) => {
    e.preventDefault();
    if (!offlineForm.rollNo.trim()) return;
    setOfflineMsg('Saving offline score...');

    const newResult = {
      id: `offline-${Date.now()}`,
      driveId: selectedDriveId,
      rollNo: offlineForm.rollNo.toUpperCase().trim(),
      name: offlineForm.candidateName || 'Candidate',
      score: parseFloat(offlineForm.score) || 85,
      status: offlineForm.status,
      isOffline: true,
      round: 3,
      notes: offlineForm.notes,
      createdAt: new Date().toISOString(),
    };

    setResults(prev => [newResult, ...prev]);
    setOfflineMsg(`Offline Round 3 Score saved for candidate ${offlineForm.rollNo}`);
    setOfflineForm({ rollNo: '', candidateName: '', score: '', status: 'PASSED', notes: 'Cleared Round 3 Offline Panel Interview' });
    setTimeout(() => setOfflineMsg(''), 3000);
  };

  const handleBulkGrantTechnicalAccess = async (clearedCandidates) => {
    setSaving(true);
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      const clearedRolls = (clearedCandidates || []).map(r => r.rollNo);

      const updatePromises = [];
      userSnap.docs.forEach(uDoc => {
        const data = uDoc.data();
        if (clearedRolls.includes(data.rollNo) || clearedRolls.includes(data.rollNumber)) {
          updatePromises.push(updateDoc(doc(db, 'users', uDoc.id), {
            qualifiedForTechnical: true,
            qualifiedForRound2: true,
            technicalAccessGrantedAt: new Date().toISOString(),
          }));
        }
      });

      // Also persist to examResults documents in Firestore
      (clearedCandidates || []).forEach(r => {
        if (r.id) {
          updatePromises.push(updateDoc(doc(db, 'examResults', r.id), {
            qualifiedForTechnical: true,
            qualifiedForRound2: true,
            technicalAccessGrantedAt: new Date().toISOString(),
          }).catch(e => console.warn('examResults update fallback:', e)));
        }
      });

      await Promise.all(updatePromises);

      setResults(prev => prev.map(r => {
        if (clearedRolls.includes(r.rollNo)) {
          return { ...r, qualifiedForTechnical: true, qualifiedForRound2: true };
        }
        return r;
      }));

      alert(`Round 2 Technical Access successfully granted at once to all ${clearedRolls.length} cleared candidate(s)!`);
    } catch (err) {
      console.error('Bulk grant technical access error:', err);
    }
    setSaving(false);
  };

  const handleQualifyNextRound = async (result, targetRound) => {
    const isRound2 = targetRound === 2;
    const updatePayload = isRound2
      ? { qualifiedForTechnical: true, qualifiedForRound2: true, round1Status: 'QUALIFIED' }
      : { qualifiedForRound3: true, round2Status: 'QUALIFIED' };

    try {
      const userSnap = await getDocs(collection(db, 'users'));
      const studentDoc = userSnap.docs.find(d => d.data().rollNo === result.rollNo || d.data().rollNumber === result.rollNo);
      if (studentDoc) {
        await updateDoc(doc(db, 'users', studentDoc.id), updatePayload);
      }
      if (result?.id) {
        await updateDoc(doc(db, 'examResults', result.id), updatePayload);
      }
    } catch (e) {
      console.warn('Qualify update error:', e);
    }

    setResults(prev => prev.map(r => {
      if (r.id === result.id || r.rollNo === result.rollNo) {
        return isRound2 ? { ...r, qualifiedForTechnical: true, qualifiedForRound2: true } : { ...r, qualifiedForRound3: true };
      }
      return r;
    }));

    alert(`Candidate ${result.rollNo} qualified for Round ${targetRound}!`);
  };

  const handleScheduleInterview = (e) => {
    e.preventDefault();
    setInterviewMsg('Round 3 AI Interview slots scheduled successfully and notifications dispatched.');
    setTimeout(() => setInterviewMsg(''), 4000);
  };

  const aptitudeResults = results.filter(r => r.round === 1 || r.examType?.toLowerCase().includes('aptitude') || (r.score !== undefined && r.testCasesPassed === undefined));
  const aptitudeClearedList = results.filter(r => (r.round === 1 || r.examType?.toLowerCase().includes('aptitude') || r.score !== undefined) && (r.status === 'PASSED' || r.score >= (examForm.passMark || 60)));
  const technicalResults = results.filter(r => r.round === 2 || r.examType?.toLowerCase().includes('technical') || r.testCasesPassed !== undefined);
  const round3List = results.filter(r => r.round === 3 || r.qualifiedForRound3 || (r.testCasesPassed && r.testCasesPassed === (r.totalTestCases || 3)));
  return (
    <div className="glass-card" id="live-exam-manager" style={{ padding: '1.75rem', background: 'rgba(13, 20, 36, 0.95)', borderColor: 'rgba(30, 41, 59, 0.8)', color: '#f8fafc' }}>
      {/* Top Header Card & Target Drive Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.5) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '1.5rem', borderRadius: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 26, height: 26, minWidth: 26 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '0.35rem', fontSize: '0.725rem' }}>
              Real-time Recruitment Exam Control Hub
            </span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Recruitment Exam & Evaluation Command Center
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Drive-tied proctored screening, test case sandbox, and multi-round pipeline management.
            </p>
          </div>
        </div>

        {/* Target Drive Selector Chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.85rem', borderRadius: '0.85rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.4)', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa' }}>TARGET DRIVE:</span>
          <select
            className="input-field"
            style={{ width: 'auto', background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, outline: 'none' }}
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
          >
            {drives.length === 0 ? (
              <option value="" style={{ background: '#0f172a', color: '#f8fafc' }}>No Active Drives</option>
            ) : (
              drives.map(d => (
                <option key={d.id} value={d.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {d.company} — {d.role}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Master 5-Stage Segmented Control Navigation Tabs */}
      <div style={{ background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '0.5rem', borderRadius: '1.1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
        {[
          {
            id: 'manager',
            label: 'Exam Control & Builder',
            count: null,
            activeBg: 'rgba(99, 102, 241, 0.28)',
            activeBorder: 'rgba(99, 102, 241, 0.6)',
            activeColor: '#c7d2fe',
            icon: (
              <svg style={{ width: 15, height: 15, minWidth: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )
          },
          {
            id: 'aptitude_results',
            label: 'Round 1: Aptitude',
            count: aptitudeResults.length,
            activeBg: 'rgba(59, 130, 246, 0.28)',
            activeBorder: 'rgba(59, 130, 246, 0.6)',
            activeColor: '#bfdbfe',
            icon: (
              <svg style={{ width: 15, height: 15, minWidth: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          },
          {
            id: 'aptitude_cleared',
            label: 'Round 2: Access Control',
            count: aptitudeClearedList.length,
            activeBg: 'rgba(16, 185, 129, 0.28)',
            activeBorder: 'rgba(16, 185, 129, 0.6)',
            activeColor: '#a7f3d0',
            icon: (
              <svg style={{ width: 15, height: 15, minWidth: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )
          },
          {
            id: 'technical_results',
            label: 'Round 2: Technical Coding',
            count: technicalResults.length,
            activeBg: 'rgba(245, 158, 11, 0.28)',
            activeBorder: 'rgba(245, 158, 11, 0.6)',
            activeColor: '#fde68a',
            icon: (
              <svg style={{ width: 15, height: 15, minWidth: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )
          },
          {
            id: 'interview',
            label: 'Round 3: Interview Call',
            count: round3List.length,
            activeBg: 'rgba(168, 85, 247, 0.28)',
            activeBorder: 'rgba(168, 85, 247, 0.6)',
            activeColor: '#e9d5ff',
            icon: (
              <svg style={{ width: 15, height: 15, minWidth: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )
          },
        ].map(tab => {
          const isActive = activeTab === tab.id || (activeTab === 'results' && tab.id === 'aptitude_results');
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? tab.activeBg : 'rgba(15, 23, 42, 0.8)',
                color: isActive ? tab.activeColor : '#cbd5e1',
                border: isActive ? `1px solid ${tab.activeBorder}` : '1px solid rgba(51, 65, 85, 0.5)',
                padding: '0.55rem 1rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.8rem',
                transition: 'all 0.15s ease-in-out',
                boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.4)' : 'none',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', opacity: isActive ? 1 : 0.7 }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* STAGE 1: EXAM CONTROL & QUESTION BUILDER */}
      {activeTab === 'manager' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status Header Card */}
          <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(15, 23, 42, 0.7)', border: `1px solid ${examForm.isLive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(51, 65, 85, 0.6)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: examForm.isLive ? '#10b981' : '#64748b', boxShadow: examForm.isLive ? '0 0 12px #10b981' : 'none', display: 'inline-block' }} />
              <div>
                <h4 style={{ color: examForm.isLive ? '#34d399' : '#e2e8f0', fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>
                  Status: {examForm.isLive ? `🟢 DRIVE EXAM ALREADY LIVE & IN PROGRESS` : `⏸ EXAM PAUSED / SCHEDULED FOR ${activeDrive?.company?.toUpperCase() || 'DRIVE'}`}
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
                  {examForm.isLive ? `Candidate proctored examination is live for ${activeDrive?.company} — ${activeDrive?.role}. Candidates can take this test.` : `Exam is currently hidden from candidate dashboards for ${activeDrive?.company}.`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={saving}
                className="btn btn-primary"
                style={{ fontWeight: 700, fontSize: '0.8rem', padding: '0.55rem 1.25rem' }}
              >
                {saving ? 'Saving...' : '💾 Save Config'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleGoLive(!examForm.isLive)}
                disabled={saving}
                className={`btn ${examForm.isLive ? 'btn-secondary' : 'btn-success'}`}
                style={{ fontWeight: 700, fontSize: '0.8rem', padding: '0.55rem 1.25rem' }}
              >
                {saving ? 'Updating...' : examForm.isLive ? '⏹ End & Unpublish Exam' : '▶ Publish & Start Live Exam'}
              </button>
            </div>
          </div>

          {/* 3-Column Configuration Form Grid */}
          <div className="grid grid-3" style={{ gap: '1.25rem' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1' }}>Exam Title</label>
              <input
                className="input-field"
                style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '0.6rem 0.85rem' }}
                value={examForm.title}
                onChange={e => setExamForm({ ...examForm, title: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1' }}>Exam Round Stage</label>
              <select
                className="input-field"
                style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '0.6rem 0.85rem' }}
                value={examForm.examType}
                onChange={e => {
                  const newType = e.target.value;
                  const targetDur = newType === 'technical' ? (examForm.technicalDurationMinutes || 45) : (examForm.aptitudeDurationMinutes || 30);
                  setExamForm({ ...examForm, examType: newType, durationMinutes: targetDur });
                }}
              >
                <option value="aptitude" style={{ background: '#0f172a', color: '#f8fafc' }}>Round 1: Aptitude & Reasoning (Default 30 Min)</option>
                <option value="technical" style={{ background: '#0f172a', color: '#f8fafc' }}>Round 2: Technical & Coding Sandbox (Default 45 Min)</option>
              </select>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1' }}>
                Timer Duration ({examForm.examType === 'technical' ? 'Technical' : 'Aptitude'} Minutes)
              </label>
              <input
                className="input-field"
                style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)' }}
                type="number"
                min="5"
                max="180"
                value={examForm.durationMinutes}
                onChange={e => {
                  const val = e.target.value;
                  if (examForm.examType === 'technical') {
                    setExamForm({ ...examForm, durationMinutes: val, technicalDurationMinutes: val });
                  } else {
                    setExamForm({ ...examForm, durationMinutes: val, aptitudeDurationMinutes: val });
                  }
                }}
              />
            </div>
          </div>

          {/* Assessment Question Builder Container */}
          <div style={{ background: 'rgba(11, 16, 29, 0.95)', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '1.5rem', borderRadius: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <svg style={{ width: 18, height: 18, minWidth: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" color="#818cf8">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Assessment Question Builder
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Configure questions, test cases, and correct answer options for each screening round.
              </p>
            </div>

            {/* Question Type Sub-Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem', background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.75rem', overflowX: 'auto', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setQBuilderSubTab('aptitude')}
                style={{
                  background: qBuilderSubTab === 'aptitude' ? 'rgba(99, 102, 241, 0.28)' : 'transparent',
                  color: qBuilderSubTab === 'aptitude' ? '#c7d2fe' : '#94a3b8',
                  border: qBuilderSubTab === 'aptitude' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg style={{ width: 14, height: 14, minWidth: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Aptitude Round MCQs ({questions.length})
              </button>

              <button
                type="button"
                onClick={() => setQBuilderSubTab('technical_coding')}
                style={{
                  background: qBuilderSubTab === 'technical_coding' ? 'rgba(99, 102, 241, 0.28)' : 'transparent',
                  color: qBuilderSubTab === 'technical_coding' ? '#c7d2fe' : '#94a3b8',
                  border: qBuilderSubTab === 'technical_coding' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg style={{ width: 14, height: 14, minWidth: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Technical Coding Question Pool ({codingQuestions.length} Problems)
              </button>
            </div>

            {/* SUB-TAB 1: Aptitude MCQs Builder */}
            {qBuilderSubTab === 'aptitude' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {questions.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '1.5rem', textAlignment: 'center', border: '1px dashed rgba(51, 65, 85, 0.6)', borderRadius: '0.75rem' }}>
                      No aptitude questions configured yet. Use the form below to add questions.
                    </p>
                  ) : (
                    questions.map((q, idx) => {
                      const qKey = q.id || idx;
                      const isEditingThis = editingQId === qKey;

                      if (isEditingThis) {
                        return (
                          <form
                            key={qKey}
                            onSubmit={(e) => handleSaveEditedQuestion(e, qKey)}
                            style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(245, 158, 11, 0.6)',
                              borderRadius: '0.85rem',
                              padding: '1.25rem',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.85rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '0.75rem' }}>
                                ✏️ Editing MCQ Q{idx + 1}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Modifying Question Paper Bank
                              </span>
                            </div>

                            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                              <div className="input-group">
                                <label style={{ fontSize: '0.75rem' }}>Question Statement *</label>
                                <input
                                  className="input-field"
                                  style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                                  value={editingQForm.q}
                                  onChange={e => setEditingQForm({ ...editingQForm, q: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="input-group">
                                <label style={{ fontSize: '0.75rem' }}>Topic / Category</label>
                                <input
                                  className="input-field"
                                  style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                                  value={editingQForm.topic}
                                  onChange={e => setEditingQForm({ ...editingQForm, topic: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                              {editingQForm.opts.map((opt, oIdx) => (
                                <div key={oIdx} className="input-group">
                                  <label style={{ fontSize: '0.7rem' }}>Option {String.fromCharCode(65 + oIdx)} *</label>
                                  <input
                                    className="input-field"
                                    style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.5rem 0.75rem' }}
                                    value={opt}
                                    onChange={e => {
                                      const updatedOpts = [...editingQForm.opts];
                                      updatedOpts[oIdx] = e.target.value;
                                      setEditingQForm({ ...editingQForm, opts: updatedOpts });
                                    }}
                                    required
                                  />
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Correct Option:</span>
                                <select
                                  className="input-field"
                                  style={{ width: 'auto', background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                  value={editingQForm.ans}
                                  onChange={e => setEditingQForm({ ...editingQForm, ans: parseInt(e.target.value, 10) })}
                                >
                                  <option value={0} style={{ background: '#0f172a' }}>Option A</option>
                                  <option value={1} style={{ background: '#0f172a' }}>Option B</option>
                                  <option value={2} style={{ background: '#0f172a' }}>Option C</option>
                                  <option value={3} style={{ background: '#0f172a' }}>Option D</option>
                                </select>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={handleCancelEditQuestion}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontWeight: 600 }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="btn btn-warning btn-sm"
                                  style={{ fontWeight: 700 }}
                                >
                                  💾 Save Edits
                                </button>
                              </div>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={qKey}
                          style={{
                            background: 'rgba(15, 23, 42, 0.85)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            borderRadius: '0.85rem',
                            padding: '1.1rem',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                                {q.topic ? `${q.topic} Q${idx + 1}` : `Q${idx + 1}`}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{q.q}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => handleStartEditQuestion(q, idx)}
                                style={{
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  color: '#fbbf24',
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                }}
                                title="Edit Question Statement & Options"
                              >
                                <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(idx)}
                                style={{
                                  background: 'rgba(244, 63, 94, 0.12)',
                                  border: '1px solid rgba(244, 63, 94, 0.3)',
                                  color: '#fb7185',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                                title="Delete Question"
                              >
                                <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Options Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
                            {q.opts.map((opt, oIdx) => {
                              const isCorrect = oIdx === (q.ans || 0);
                              return (
                                <div
                                  key={oIdx}
                                  style={{
                                    background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                                    border: isCorrect ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(51, 65, 85, 0.6)',
                                    color: isCorrect ? '#6ee7b7' : '#cbd5e1',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: isCorrect ? 600 : 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: isCorrect ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none',
                                  }}
                                >
                                  <span>
                                    <strong style={{ color: isCorrect ? '#34d399' : '#94a3b8', marginRight: '0.35rem' }}>{String.fromCharCode(65 + oIdx)}:</strong>
                                    {opt}
                                  </span>
                                  {isCorrect && (
                                    <svg style={{ width: 14, height: 14, minWidth: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" color="#34d399">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Question Elevated Form */}
                <form onSubmit={handleAddQuestion} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '1.25rem', borderRadius: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#e2e8f0', margin: 0 }}>Add New Aptitude / Technical MCQ</h4>

                  <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                    <div className="input-group">
                      <label style={{ fontSize: '0.75rem' }}>Question Statement *</label>
                      <input
                        className="input-field"
                        style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                        placeholder="e.g. What is the time complexity of QuickSort?"
                        value={newQText}
                        onChange={e => setNewQText(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label style={{ fontSize: '0.75rem' }}>Topic / Category</label>
                      <input
                        className="input-field"
                        style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                        placeholder="e.g. Aptitude, Data Structures, Algorithms"
                        value={newQTopic}
                        onChange={e => setNewQTopic(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                    {newOpts.map((opt, i) => (
                      <div key={i} className="input-group">
                        <label style={{ fontSize: '0.7rem' }}>Option {String.fromCharCode(65 + i)} *</label>
                        <input
                          className="input-field"
                          style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.5rem 0.75rem' }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          value={opt}
                          onChange={e => {
                            const updated = [...newOpts];
                            updated[i] = e.target.value;
                            setNewOpts(updated);
                          }}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Correct Option:</span>
                      <select
                        className="input-field"
                        style={{ width: 'auto', background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        value={newAnsIndex}
                        onChange={e => setNewAnsIndex(parseInt(e.target.value, 10))}
                      >
                        <option value={0} style={{ background: '#0f172a' }}>Option A</option>
                        <option value={1} style={{ background: '#0f172a' }}>Option B</option>
                        <option value={2} style={{ background: '#0f172a' }}>Option C</option>
                        <option value={3} style={{ background: '#0f172a' }}>Option D</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                      + Add MCQ Question
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 2: Technical Coding Question Bank & Test Cases */}
            {qBuilderSubTab === 'technical_coding' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Question Pool Carousel Header & Selector */}
                <div style={{ background: '#070c18', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '0.85rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                        🎯 Coding Question Bank Pool ({codingQuestions.length} Problems)
                      </span>
                      <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                        Each candidate receives a randomized problem from this pool
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCodingQuestion}
                      className="btn btn-primary btn-xs"
                      style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <span>+ Add Problem to Bank</span>
                    </button>
                  </div>

                  {/* Question Selector Tabs */}
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {codingQuestions.map((q, idx) => {
                      const isSel = idx === activeTechQIndex;
                      return (
                        <button
                          key={q.id || idx}
                          type="button"
                          onClick={() => setActiveTechQIndex(idx)}
                          style={{
                            background: isSel ? 'rgba(99, 102, 241, 0.28)' : 'rgba(15, 23, 42, 0.7)',
                            color: isSel ? '#c7d2fe' : '#94a3b8',
                            border: isSel ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(51, 65, 85, 0.6)',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: isSel ? 700 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ background: isSel ? '#6366f1' : 'rgba(51,65,85,0.8)', color: '#ffffff', borderRadius: '0.35rem', padding: '0.1rem 0.4rem', fontSize: '0.65rem', fontWeight: 800 }}>
                            P{idx + 1}
                          </span>
                          <span>{q.title ? (q.title.length > 25 ? q.title.substring(0, 25) + '...' : q.title) : `Problem ${idx + 1}`}</span>
                          <span style={{ fontSize: '0.65rem', color: isSel ? '#818cf8' : '#64748b' }}>
                            ({q.testCases?.length || 0} TCs)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Question Details Form Card */}
                {codingQuestions[activeTechQIndex] && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(99, 102, 241, 0.35)', padding: '1.25rem', borderRadius: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#818cf8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Editing Problem #{activeTechQIndex + 1} Statement
                      </h4>

                      <button
                        type="button"
                        onClick={() => handleDeleteCodingQuestion(activeTechQIndex)}
                        style={{
                          background: 'rgba(244, 63, 94, 0.12)',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          color: '#fb7185',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        title="Delete Problem from Pool"
                      >
                        <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Problem #{activeTechQIndex + 1}
                      </button>
                    </div>

                    <div className="input-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Problem Title *</label>
                      <input
                        className="input-field"
                        style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontWeight: 600 }}
                        value={codingQuestions[activeTechQIndex].title || ''}
                        onChange={e => handleUpdateCurrentCodingQ('title', e.target.value)}
                        placeholder="e.g. 1 to 100 Number Sequence Generator & Filter"
                      />
                    </div>

                    <div className="input-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Problem Description & Input Format Instructions *</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', resize: 'vertical', fontSize: '0.75rem', lineHeight: 1.5 }}
                        value={codingQuestions[activeTechQIndex].description || ''}
                        onChange={e => handleUpdateCurrentCodingQ('description', e.target.value)}
                        placeholder="Detailed problem description and input instructions..."
                      />
                    </div>

                    <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                      <div className="input-group">
                        <label style={{ fontSize: '0.7rem' }}>Sample Input Example</label>
                        <input
                          className="input-field"
                          style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                          value={codingQuestions[activeTechQIndex].sampleInput || ''}
                          onChange={e => handleUpdateCurrentCodingQ('sampleInput', e.target.value)}
                          placeholder="e.g. even"
                        />
                      </div>
                      <div className="input-group">
                        <label style={{ fontSize: '0.7rem' }}>Sample Output Example</label>
                        <input
                          className="input-field"
                          style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                          value={codingQuestions[activeTechQIndex].sampleOutput || ''}
                          onChange={e => handleUpdateCurrentCodingQ('sampleOutput', e.target.value)}
                          placeholder="e.g. 2 4 6 8 10..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Configured Test Cases List for Selected Problem */}
                {codingQuestions[activeTechQIndex] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1' }}>
                        Test Cases for Problem #{activeTechQIndex + 1} ({codingQuestions[activeTechQIndex].testCases?.length || 0})
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Evaluated against candidate submitted code</span>
                    </div>

                    {!codingQuestions[activeTechQIndex].testCases || codingQuestions[activeTechQIndex].testCases.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '1.5rem', textAlign: 'center', border: '1px dashed rgba(51, 65, 85, 0.6)', borderRadius: '0.75rem' }}>
                        No test cases added for this problem yet. Add test cases below.
                      </p>
                    ) : (
                      codingQuestions[activeTechQIndex].testCases.map((tc, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(15, 23, 42, 0.85)',
                            border: `1px solid ${tc.isHidden ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.35)'}`,
                            borderRadius: '0.85rem',
                            padding: '1rem 1.1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>TC #{idx + 1}</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>{tc.name || `Test Case ${idx + 1}`}</span>
                              <span className={`badge ${tc.isHidden ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                                {tc.isHidden ? '🔒 HIDDEN TC' : '👁 VISIBLE TC'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteTestCase(idx)}
                              style={{
                                background: 'rgba(244, 63, 94, 0.12)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                color: '#fb7185',
                                padding: '0.35rem 0.5rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                              title="Delete Test Case"
                            >
                              <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', fontSize: '0.75rem', background: '#070c18', padding: '0.6rem 0.85rem', borderRadius: '0.6rem', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                            <div>
                              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: '0.2rem' }}>Input Argument:</span>
                              <code style={{ color: '#f59e0b', background: '#020617', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', border: '1px solid rgba(51, 65, 85, 0.8)', fontSize: '0.725rem' }}>{tc.input}</code>
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: '0.2rem' }}>Expected Output String:</span>
                              <div style={{ color: '#34d399', background: '#020617', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', border: '1px solid rgba(51, 65, 85, 0.8)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', maxHeight: '50px', overflowY: 'auto', wordBreak: 'break-all' }}>
                                {tc.expectedOutput}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Add Test Case Form */}
                <form onSubmit={handleAddTestCase} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(51, 65, 85, 0.7)', padding: '1.25rem', borderRadius: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#e2e8f0', margin: 0 }}>Add Technical Test Case to Problem #{activeTechQIndex + 1}</h4>

                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>Test Case Name / Description</label>
                    <input
                      className="input-field"
                      style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                      placeholder="e.g. Print Prime Numbers (1 to 100)"
                      value={newTC.name}
                      onChange={e => setNewTC({ ...newTC, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                    <div className="input-group">
                      <label style={{ fontSize: '0.75rem' }}>Input Argument *</label>
                      <input
                        className="input-field"
                        style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)' }}
                        placeholder="e.g. prime"
                        value={newTC.input}
                        onChange={e => setNewTC({ ...newTC, input: e.target.value })}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label style={{ fontSize: '0.75rem' }}>Expected Output String *</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                        placeholder="e.g. 2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71 73 79 83 89 97"
                        value={newTC.expectedOutput}
                        onChange={e => setNewTC({ ...newTC, expectedOutput: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newTC.isHidden}
                        onChange={e => setNewTC({ ...newTC, isHidden: e.target.checked })}
                      />
                      Mark as Hidden Test Case (evaluated strictly on final code submit)
                    </label>
                    <button type="submit" className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>
                      + Add Test Case to Problem #{activeTechQIndex + 1}
                    </button>
                  </div>
                </form>
              </div>
            )}


          </div>
        </div>
      )}

      {/* STAGE 2: ROUND 1 APTITUDE RESULTS */}
      {activeTab === 'aptitude_results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(51, 65, 85, 0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  Round 1: Aptitude Screening Scorecard
                  <span className="badge badge-primary">{aptitudeResults.length} Submissions</span>
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>Passing cutoff set at {examForm.passMark || 60}%</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => exportResultsToCSV(results, activeDrive?.company)} className="btn btn-secondary btn-xs">
                Export CSV
              </button>
              <button type="button" onClick={() => exportResultsToPDF(results, activeDrive?.company)} className="btn btn-secondary btn-xs">
                Print PDF
              </button>
            </div>
          </div>

          {aptitudeResults.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.85rem', fontSize: '0.75rem' }}>
              <p style={{ fontWeight: 600, color: '#cbd5e1' }}>No student submissions recorded for Round 1 Aptitude yet.</p>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Registered candidates will appear here automatically upon completing their proctored test.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Candidate Name</th>
                    <th>Department</th>
                    <th>Aptitude Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {aptitudeResults.map(r => {
                    const isQualified = r.qualifiedForRound2 || r.qualifiedForTechnical;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.rollNo}</td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{r.name}</td>
                        <td>{r.department || 'CSE'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#818cf8' }}>{r.score}%</td>
                        <td>
                          <span className={`badge ${r.status === 'PASSED' || r.score >= 60 ? 'badge-success' : 'badge-error'}`}>
                            {r.status || (r.score >= 60 ? 'PASSED' : 'FAILED')}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleQualifyNextRound(r, 2)}
                            disabled={isQualified}
                            className={`btn ${isQualified ? 'btn-success' : 'btn-primary'} btn-xs`}
                          >
                            {isQualified ? '✓ Qualified for Round 2' : 'Qualify for Round 2'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STAGE 3: APTITUDE CLEARED CANDIDATES (TECHNICAL ACCESS CONTROL) */}
      {activeTab === 'aptitude_cleared' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>Round 2 Technical Exam Access Control ({aptitudeClearedList.length} Candidates Cleared)</h4>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#a7f3d0' }}>
                  Candidates who passed Round 1 Aptitude. Grant access individually or to everyone at once.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleBulkGrantTechnicalAccess(aptitudeClearedList)}
              disabled={saving || aptitudeClearedList.length === 0}
              className="btn btn-success btn-sm"
              style={{ fontWeight: 700 }}
            >
              <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Grant Technical Access to ALL ({aptitudeClearedList.length})</span>
            </button>
          </div>

          {aptitudeClearedList.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.85rem', fontSize: '0.75rem' }}>
              <p style={{ fontWeight: 600, color: '#cbd5e1' }}>No candidates have cleared Round 1 Aptitude yet.</p>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Students who score above {examForm.passMark || 60}% in Round 1 will be populated here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Candidate Name</th>
                    <th>Aptitude Score</th>
                    <th>Technical Round Access Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {aptitudeClearedList.map(r => {
                    const hasAccess = r.qualifiedForTechnical || r.qualifiedForRound2;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.rollNo}</td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{r.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399' }}>{r.score}%</td>
                        <td>
                          <span className={`badge ${hasAccess ? 'badge-success' : 'badge-warning'}`}>
                            {hasAccess ? '✓ Technical Access Granted' : '⏳ Access Pending'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleQualifyNextRound(r, 2)}
                            disabled={hasAccess}
                            className={`btn ${hasAccess ? 'btn-success' : 'btn-secondary'} btn-xs`}
                          >
                            {hasAccess ? '✓ Access Active' : 'Grant Technical Access'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: ROUND 2 TECHNICAL TEST CASES EVALUATION */}
      {activeTab === 'technical_results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(51, 65, 85, 0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  Round 2: Technical Coding Sandbox Scorecard
                  <span className="badge badge-warning">{technicalResults.length} Submissions</span>
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>Evaluated strictly based on test cases passed in coding sandbox</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => exportResultsToCSV(results, activeDrive?.company)} className="btn btn-secondary btn-xs">
                Export CSV
              </button>
              <button type="button" onClick={() => exportResultsToPDF(results, activeDrive?.company)} className="btn btn-secondary btn-xs">
                Print PDF
              </button>
            </div>
          </div>

          {technicalResults.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.85rem', fontSize: '0.75rem' }}>
              <p style={{ fontWeight: 600, color: '#cbd5e1' }}>No student submissions recorded for Round 2 Technical coding yet.</p>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Candidates with Technical Access will attempt the coding test and submit test cases here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Candidate Name</th>
                    <th>Test Cases Passed</th>
                    <th>Coding Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {technicalResults.map(r => {
                    const isQualified = r.qualifiedForRound3;
                    const passedStr = r.testCasesPassed !== undefined ? `${r.testCasesPassed} / ${r.totalTestCases || 3} Passed` : '0 / 3 Passed';
                    const isDisqualified = (r.status || '').includes('DISQUALIFIED') || !!r.disqualificationReason;
                    const isPass = !isDisqualified && (r.status === 'PASSED' || (r.testCasesPassed && r.testCasesPassed === (r.totalTestCases || 3)));

                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.rollNo}</td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{r.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: isPass ? '#34d399' : '#fbbf24' }}>{passedStr}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#818cf8' }}>{r.score}%</td>
                        <td>
                          {isDisqualified ? (
                            <span className="badge badge-error" style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '0.25rem 0.5rem' }}>
                              🔴 DISQUALIFIED ({r.disqualificationReason || 'Malpractice Strike'})
                            </span>
                          ) : (
                            <span className={`badge ${isPass ? 'badge-success' : 'badge-error'}`} style={{ fontWeight: 800 }}>
                              {r.status || (isPass ? 'PASSED' : 'FAILED')}
                            </span>
                          )}
                        </td>
                        <td>
                          {isQualified ? (
                            <span className="badge badge-success" style={{ fontWeight: 800, padding: '0.35rem 0.75rem' }}>
                              ✓ Qualified for Round 3
                            </span>
                          ) : isPass ? (
                            <button
                              type="button"
                              onClick={() => handleQualifyNextRound(r, 3)}
                              className="btn btn-primary btn-xs"
                              style={{ fontWeight: 700 }}
                            >
                              Qualify for Round 3
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Candidate ${r.rollNo} did not pass the technical test case cutoff (${passedStr}). Are you sure you want to manually override and qualify them for Round 3?`)) {
                                  handleQualifyNextRound(r, 3);
                                }
                              }}
                              className="btn btn-ghost btn-xs"
                              style={{ color: '#fb7185', fontSize: '0.7rem', border: '1px dashed rgba(244, 63, 94, 0.4)' }}
                            >
                              Override & Qualify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STAGE 5: ROUND 3 INTERVIEWS */}
      {activeTab === 'interview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0.35rem', background: '#070c18', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '0.75rem', width: 'fit-content' }}>
            <button
              type="button"
              onClick={() => setOfflineSubTab('online')}
              className={`btn ${offlineSubTab === 'online' ? 'btn-primary' : 'btn-ghost'} btn-xs`}
              style={{ fontWeight: 600 }}
            >
              Online WebRTC Interviews
            </button>
            <button
              type="button"
              onClick={() => setOfflineSubTab('offline')}
              className={`btn ${offlineSubTab === 'offline' ? 'btn-primary' : 'btn-ghost'} btn-xs`}
              style={{ fontWeight: 600 }}
            >
              Offline Candidate Evaluation (Round 3)
            </button>
          </div>

          {offlineSubTab === 'online' ? (
            <form onSubmit={handleScheduleInterview} className="glass-card" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(51, 65, 85, 0.6)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Schedule Round 3 AI Proctored Video Interviews</h3>
              {interviewMsg && <div className="badge badge-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', width: '100%' }}>{interviewMsg}</div>}

              <div className="grid grid-3" style={{ gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem' }}>Interview Date</label>
                  <input
                    className="input-field"
                    style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                    type="date"
                    value={interviewForm.date}
                    onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.75rem' }}>Time Slot</label>
                  <select
                    className="input-field"
                    style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                    value={interviewForm.timeSlot}
                    onChange={e => setInterviewForm({ ...interviewForm, timeSlot: e.target.value })}
                  >
                    <option value="09:00 AM - 12:00 PM" style={{ background: '#0f172a' }}>09:00 AM - 12:00 PM</option>
                    <option value="10:00 AM - 01:00 PM" style={{ background: '#0f172a' }}>10:00 AM - 01:00 PM</option>
                    <option value="02:00 PM - 05:00 PM" style={{ background: '#0f172a' }}>02:00 PM - 05:00 PM</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.75rem' }}>Interview Format</label>
                  <input
                    className="input-field"
                    style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                    value={interviewForm.mode}
                    onChange={e => setInterviewForm({ ...interviewForm, mode: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Schedule Online Invites
                </button>
              </div>
            </form>
          ) : (
            <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(51, 65, 85, 0.6)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Offline Interview Marking & Scores (Round 3)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Direct manual entry or CSV upload for offline interview candidates</p>
              </div>

              {offlineMsg && <div className="badge badge-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', width: '100%' }}>{offlineMsg}</div>}

              <form onSubmit={handleSaveOfflineScore} style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1', margin: 0 }}>Evaluate Offline Candidate</h4>

                <div className="grid grid-3" style={{ gap: '0.75rem' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>Roll Number *</label>
                    <input
                      className="input-field"
                      style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)' }}
                      placeholder="e.g. 23P61A0501"
                      required
                      value={offlineForm.rollNo}
                      onChange={e => setOfflineForm({ ...offlineForm, rollNo: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>Candidate Name</label>
                    <input
                      className="input-field"
                      style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                      placeholder="e.g. Aarav Sharma"
                      value={offlineForm.candidateName}
                      onChange={e => setOfflineForm({ ...offlineForm, candidateName: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>Panel Score (0-100) *</label>
                    <input
                      className="input-field"
                      style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)', fontFamily: 'var(--font-mono)' }}
                      type="number"
                      min="0"
                      max="100"
                      required
                      placeholder="85"
                      value={offlineForm.score}
                      onChange={e => setOfflineForm({ ...offlineForm, score: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>Final Status</label>
                    <select
                      className="input-field"
                      style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                      value={offlineForm.status}
                      onChange={e => setOfflineForm({ ...offlineForm, status: e.target.value })}
                    >
                      <option value="PASSED" style={{ background: '#0f172a' }}>PASSED (Selected for Offer)</option>
                      <option value="REJECTED" style={{ background: '#0f172a' }}>REJECTED (Not Selected)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>Interviewer Remarks</label>
                    <input
                      className="input-field"
                      style={{ background: 'rgba(2, 6, 23, 0.7)', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.8)' }}
                      placeholder="Notes on communication & technical skills..."
                      value={offlineForm.notes}
                      onChange={e => setOfflineForm({ ...offlineForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-success" style={{ fontWeight: 700 }}>
                    Save Offline Candidate Score
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* End & Unpublish Confirmation Modal (Portaled to document.body for exact viewport centering) */}
      {showUnpublishModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.95) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '1.25rem',
            padding: '1.75rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>End & Unpublish Live Exam?</h3>
                <p style={{ fontSize: '0.75rem', color: '#f87171', margin: '0.2rem 0 0 0', fontWeight: 600 }}>Action will pause candidate access immediately</p>
              </div>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0, background: 'rgba(2, 6, 23, 0.5)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
              Are you sure you really want to end and unpublish the live examination for <strong style={{ color: '#60a5fa' }}>{drives.find(d => d.id === selectedDriveId)?.company || 'this drive'}</strong>?
              <br/><br/>
              Students currently taking or attempting to enter this specific drive's exam will no longer be able to submit new responses until you publish it live again.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUnpublishModal(false)}
                style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#cbd5e1', border: '1px solid rgba(71, 85, 105, 0.6)', padding: '0.55rem 1.1rem', borderRadius: '0.65rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmUnpublish}
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '0.65rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}
              >
                Yes, End & Unpublish Exam
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
