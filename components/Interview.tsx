import React, { useState } from 'react';
import { 
  Briefcase, 
  Sparkles, 
  Send, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  FileText
} from 'lucide-react';
import { generateInterviewQuestions, evaluateCandidateResponse } from '../services/geminiService';
import { InterviewQuestion, InterviewSession, EvaluationResult } from '../types';

interface InterviewProps {
  onSaveSession: (session: InterviewSession) => void;
}

const Interview: React.FC<InterviewProps> = ({ onSaveSession }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Setup, 2: Questions, 3: Results
  const [loading, setLoading] = useState(false);
  
  // Setup State
  const [jobTitle, setJobTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [experience, setExperience] = useState('中级 (Mid-Level)');
  
  // Session State
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationResult>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleGenerateQuestions = async () => {
    if (!jobTitle || !candidateName) return;
    setLoading(true);
    const generatedQuestions = await generateInterviewQuestions(jobTitle, experience);
    if (generatedQuestions.length > 0) {
      setQuestions(generatedQuestions);
      setStep(2);
    }
    setLoading(false);
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    const currentQ = questions[currentQuestionIndex];
    setIsEvaluating(true);

    const evaluation = await evaluateCandidateResponse(currentQ.text, currentAnswer);
    
    if (evaluation) {
      setResponses(prev => ({ ...prev, [currentQ.id]: currentAnswer }));
      setEvaluations(prev => ({ ...prev, [currentQ.id]: evaluation }));
      
      setCurrentAnswer('');
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        finishSession();
      }
    }
    setIsEvaluating(false);
  };

  const finishSession = () => {
    // Only save if we have evaluations (handling async state closure)
    setStep(3);
    
    // Construct final object
    const session: InterviewSession = {
      id: crypto.randomUUID(),
      jobTitle,
      candidateName,
      date: new Date().toISOString(),
      questions,
      responses, 
      evaluations
    };
    onSaveSession(session);
  };

  const reset = () => {
    setStep(1);
    setJobTitle('');
    setCandidateName('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setResponses({});
    setEvaluations({});
    setCurrentAnswer('');
  };

  // Step 1: Setup Form
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-300" />
            AI 智能面试助手
          </h2>
          <p className="text-indigo-100 mt-2">基于 Gemini 生成定制化面试题，并提供实时的候选人回答评估。</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">招聘职位</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="例如：高级前端工程师"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">候选人姓名</label>
            <input 
              type="text" 
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="例如：张三"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">经验要求</label>
            <select 
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              <option value="初级 (Entry Level)">初级 (Entry Level)</option>
              <option value="中级 (Mid-Level)">中级 (Mid-Level)</option>
              <option value="高级 (Senior)">高级 (Senior)</option>
              <option value="专家/管理 (Executive)">专家/管理 (Executive)</option>
            </select>
          </div>

          <button 
            onClick={handleGenerateQuestions}
            disabled={!jobTitle || !candidateName || loading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : '生成面试题库'}
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Active Interview
  if (step === 2) {
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Sidebar: Progress */}
        <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4">面试进度</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {questions.map((q, idx) => (
              <div 
                key={q.id}
                className={`p-3 rounded-lg text-sm border transition-colors ${
                  idx === currentQuestionIndex 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : responses[q.id] 
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-gray-100 text-gray-500'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-xs uppercase tracking-wider">问题 {idx + 1}</span>
                  {responses[q.id] && <CheckCircle2 size={14} className="text-green-600" />}
                </div>
                <p className="line-clamp-2">{q.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main: Question & Answer */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium bg-white border border-gray-200 text-gray-600`}>
                {currentQ.category}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium 
                ${currentQ.difficulty === '困难' ? 'bg-red-100 text-red-700' : 
                  currentQ.difficulty === '中等' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>
                {currentQ.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 leading-relaxed">{currentQ.text}</h2>
          </div>

          <div className="flex-1 p-6 flex flex-col">
            <label className="text-sm font-medium text-gray-500 mb-2">候选人回答 / 面试记录</label>
            <textarea 
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="在此输入候选人的回答重点..."
              className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer.trim() || isEvaluating}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> AI 评估中...
                </>
              ) : (
                <>
                  提交并评估 <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Summary
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">面试评估报告</h2>
          <p className="text-gray-500">候选人：{candidateName} | 职位：{jobTitle}</p>
        </div>
        <button 
          onClick={reset}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
        >
          开始新的面试
        </button>
      </div>

      <div className="grid gap-6">
        {questions.map((q, idx) => {
          const evalResult = evaluations[q.id];
          return (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-800 text-lg">Q{idx+1}: {q.text}</h3>
                {evalResult && (
                  <div className={`flex flex-col items-center justify-center`}>
                     <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg border-4 
                      ${evalResult.score >= 8 ? 'border-green-500 text-green-700' : 
                        evalResult.score >= 5 ? 'border-yellow-500 text-yellow-700' : 'border-red-500 text-red-700'}`}>
                      {evalResult.score}
                    </div>
                    <span className="text-xs text-gray-400 mt-1">评分</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4 text-gray-700 italic border-l-4 border-gray-300">
                " {responses[q.id]} "
              </div>

              {evalResult && (
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                     <FileText size={18} className="text-indigo-500 mt-1 shrink-0" />
                     <p className="text-gray-600"><span className="font-medium text-gray-900">AI 综合评价:</span> {evalResult.feedback}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                      <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <CheckCircle2 size={12} /> 亮点 / 优势
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {evalResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <AlertTriangle size={12} /> 改进 / 不足
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {evalResult.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Interview;