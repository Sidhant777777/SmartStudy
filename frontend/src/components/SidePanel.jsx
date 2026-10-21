import { useState } from "react";

const RESEARCH = [
  {
    emoji: "📉",
    title: "The Forgetting Curve",
    desc: "Hermann Ebbinghaus (1885) showed we forget 70% of new info within 24 hours — unless we review at the right time.",
    link: "https://en.wikipedia.org/wiki/Forgetting_curve",
    linkLabel: "Read about it",
  },
  {
    emoji: "🏆",
    title: "FSRS Algorithm",
    desc: "The algorithm powering this app. Published at ACM KDD 2022 — outperforms SM-2 (the algorithm Anki used for 20 years).",
    link: "https://dl.acm.org/doi/10.1145/3534678.3539081",
    linkLabel: "Read the paper",
  },
  {
    emoji: "🎓",
    title: "Used in Med Schools",
    desc: "Anki (spaced repetition app) is used by 80%+ of US medical students. Studies show 20–30% higher exam scores vs passive reading.",
    link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5215552/",
    linkLabel: "See study",
  },
  {
    emoji: "🦜",
    title: "Duolingo Uses It",
    desc: "Duolingo's entire learning engine is built on spaced repetition. 500M+ users. Their 2016 paper showed 34% better retention.",
    link: "https://arxiv.org/abs/1602.07032",
    linkLabel: "Read paper",
  },
  {
    emoji: "🧠",
    title: "Why It Works",
    desc: "Each review at the right moment strengthens the memory trace. The 'testing effect' — recalling info is 2x more effective than re-reading.",
    link: "https://en.wikipedia.org/wiki/Testing_effect",
    linkLabel: "Learn more",
  },
];

export default function SidePanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40
          bg-indigo-600 hover:bg-indigo-700 text-white
          px-2 py-6 rounded-l-2xl shadow-lg
          flex flex-col items-center gap-2
          transition-all duration-200 hover:px-3"
        title="Learn & Report"
      >
        <span className="text-lg">🧪</span>
        <span className="text-xs font-medium [writing-mode:vertical-lr] rotate-180 tracking-wide">INFO</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-full max-w-sm z-50
        bg-white dark:bg-gray-900
        shadow-2xl border-l border-gray-100 dark:border-gray-800
        transform transition-transform duration-300 ease-out
        flex flex-col
        ${open ? "translate-x-0" : "translate-x-full"}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">SmartStudy</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Bug report */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-100 dark:border-red-800">
            <p className="font-semibold text-gray-800 dark:text-white mb-1">🐛 Found a bug?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Report it on GitHub — takes 30 seconds and helps make the app better.
            </p>
            <a
              href="https://github.com/Sidhant777777/SmartStudy/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              <span>Open GitHub Issue</span>
              <span>↗</span>
            </a>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">The Science</p>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
            Why does spaced repetition actually work? Here's the research:
          </p>

          {/* Research cards */}
          {RESEARCH.map((item) => (
            <div
              key={item.title}
              className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{item.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{item.desc}</p>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    {item.linkLabel} ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 text-center">
            Built with FSRS · Open source on{" "}
            <a
              href="https://github.com/Sidhant777777/SmartStudy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline"
            >
              GitHub
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
