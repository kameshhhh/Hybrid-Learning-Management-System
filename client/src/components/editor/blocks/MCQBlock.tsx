import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MCQBlockProps {
  id: string;
  content: {
    questions: {
      q: string;
      opt: string[];
      correct: number;
    }[];
  };
  isEditable?: boolean;
  isStudent?: boolean;
  onUpdate?: (content: any) => void;
  onComplete?: (score: number) => void;
}

export const MCQBlock: React.FC<MCQBlockProps> = ({ 
  content, 
  isEditable, 
  isStudent: _isStudent, 
  onUpdate,
  onComplete 
}) => {
  const [studentAnswers, setStudentAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // BUILDER MODE
  if (isEditable) {
    const addQuestion = () => {
      const newQuestions = [...content.questions, { q: 'New Question', opt: ['Option 1', 'Option 2'], correct: 0 }];
      onUpdate?.({ questions: newQuestions });
    };

    const removeQuestion = (idx: number) => {
      onUpdate?.({ questions: content.questions.filter((_, i) => i !== idx) });
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
      const newQuestions = [...content.questions];
      (newQuestions[idx] as any)[field] = value;
      onUpdate?.({ questions: newQuestions });
    };

    const updateOption = (qIdx: number, oIdx: number, value: string) => {
      const newQuestions = [...content.questions];
      newQuestions[qIdx].opt[oIdx] = value;
      onUpdate?.({ questions: newQuestions });
    };

    const addOption = (qIdx: number) => {
      const newQuestions = [...content.questions];
      newQuestions[qIdx].opt.push(`Option ${newQuestions[qIdx].opt.length + 1}`);
      onUpdate?.({ questions: newQuestions });
    };

    return (
      <div className="space-y-6 p-6 bg-slate-50 rounded-3xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Assessment (MCQ)</h4>
          <Button variant="primary" size="sm" onClick={addQuestion} leftIcon={<Plus size={14} />}>Add Question</Button>
        </div>
        
        {content.questions.map((q, qIdx) => (
          <div key={qIdx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 relative group">
            <button onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
            
            <input 
              type="text" 
              value={q.q} 
              onChange={(e) => updateQuestion(qIdx, 'q', e.target.value)}
              className="w-full font-bold text-slate-800 bg-transparent border-none focus:ring-0 text-lg outline-none"
              placeholder="Enter question..."
            />
            
            <div className="space-y-2">
              {q.opt.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuestion(qIdx, 'correct', oIdx)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${q.correct === oIdx ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <input 
                    type="text" 
                    value={opt} 
                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    className="flex-1 text-sm text-slate-600 bg-transparent border-none focus:ring-0 outline-none"
                  />
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)} className="text-blue-500 h-8 gap-1 pl-1">
                <Plus size={14} /> Add option
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // STUDENT MODE
  const handleSubmit = () => {
    let score = 0;
    content.questions.forEach((q, idx) => {
      if (studentAnswers[idx] === q.correct) score++;
    });
    setSubmitted(true);
    onComplete?.(score);
  };

  return (
    <div className="my-10 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Knowledge Check</h3>
      </div>

      <div className="space-y-10">
        {content.questions.map((q, qIdx) => (
          <div key={qIdx} className="space-y-4">
            <h4 className="text-lg font-bold text-slate-800 flex gap-3">
              <span className="text-blue-200">0{qIdx + 1}.</span> {q.q}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.opt.map((opt, oIdx) => {
                const isSelected = studentAnswers[qIdx] === oIdx;
                const isCorrect = q.correct === oIdx;
                let cardClass = "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ";
                
                if (!submitted) {
                  cardClass += isSelected ? "border-blue-500 bg-blue-50" : "border-slate-50 bg-slate-50 hover:border-slate-200";
                } else {
                  if (isSelected && isCorrect) cardClass += "border-green-500 bg-green-50";
                  else if (isSelected && !isCorrect) cardClass += "border-red-500 bg-red-50";
                  else if (isCorrect) cardClass += "border-green-300 bg-green-50/50";
                  else cardClass += "border-slate-50 bg-slate-50 opacity-50";
                }

                return (
                  <div key={oIdx} className={cardClass} onClick={() => !submitted && setStudentAnswers(prev => {
                    const next = [...prev];
                    next[qIdx] = oIdx;
                    return next;
                  })}>
                    {isSelected ? <CheckCircle2 size={18} className="text-blue-500" /> : <Circle size={18} className="text-slate-300" />}
                    <span className="font-medium text-slate-700">{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="flex justify-end pt-4">
          <Button variant="primary" size="lg" onClick={handleSubmit} disabled={studentAnswers.length < content.questions.length}>
            Submit Answers
          </Button>
        </div>
      )}
    </div>
  );
};
