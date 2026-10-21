export default function WelcomeModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <p className="text-5xl mb-3">🧠</p>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to SmartStudy</h2>
          <p className="text-gray-500 mt-2 text-sm">AI flashcards with spaced repetition — never forget what you study</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-sm">1</div>
            <div>
              <p className="font-semibold text-gray-800">Upload your PDF notes</p>
              <p className="text-gray-500 text-sm">AI reads your notes and generates flashcards automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-sm">2</div>
            <div>
              <p className="font-semibold text-gray-800">Review cards daily</p>
              <p className="text-gray-500 text-sm">Rate each card 1–4. The FSRS algorithm schedules the next review based on how well you remembered</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-sm">3</div>
            <div>
              <p className="font-semibold text-gray-800">Get daily reminders</p>
              <p className="text-gray-500 text-sm">Add your email below to get an 8 AM reminder when cards are due</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          Got it — let's start!
        </button>
      </div>
    </div>
  );
}
