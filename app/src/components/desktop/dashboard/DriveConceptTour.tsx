import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FolderLock, HardDrive, HelpCircle, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModalFocus } from '../../../hooks/useModalFocus';

const introductionSteps = [
  {
    id: 'drive',
    icon: HardDrive,
    title: 'Your Telegram account becomes the drive',
    body: 'Saved Messages is your home storage. Telegram Drive reads and writes files directly through your Telegram session.',
  },
  {
    id: 'folders',
    icon: FolderLock,
    title: 'Folders are private channels',
    body: 'Creating a folder creates a private Telegram channel owned by your account. The app presents those channels as a familiar drive.',
  },
  {
    id: 'protection',
    icon: ShieldCheck,
    title: 'Store normally or protect first',
    body: 'Every upload can be stored normally or protected locally before it reaches Telegram. Sharing and WebDAV remain explicit, opt-in actions.',
  },
];

interface DriveConceptTourProps {
  onFinish: () => void;
  onOpenHelp: () => void;
}

export function DriveConceptTour({ onFinish, onOpenHelp }: DriveConceptTourProps) {
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalFocus(panelRef, onFinish);

  const steps = introductionSteps;
  const step = steps[index];
  const Icon = step.icon;
  const isLastStep = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-md">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-tour-title"
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#1c1e24] to-[#121316] p-6 sm:p-7 shadow-2xl shadow-black/80 flex flex-col"
      >
        {/* Decorative ambient gradient */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-telegram-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-telegram-primary/15 border border-telegram-primary/30 text-telegram-primary text-xs font-semibold tracking-wider uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-telegram-primary animate-pulse" />
            Getting Started · {index + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onFinish}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Skip drive introduction"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content with animated step transition */}
        <div className="relative z-10 my-auto text-center py-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-telegram-primary/25 via-telegram-primary/10 to-transparent border border-telegram-primary/30 shadow-lg shadow-telegram-primary/15 mb-5 text-telegram-primary">
                <Icon className="h-10 w-10 drop-shadow-[0_2px_10px_rgba(42,171,238,0.5)]" />
              </div>
              <h2 id="drive-tour-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-3">
                {step.title}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-zinc-300 max-w-sm mx-auto">
                {step.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step Indicator Pills */}
        <div className="relative z-10 flex justify-center items-center gap-2 my-6" aria-label="Introduction progress">
          {steps.map((_, stepIndex) => (
            <button
              key={stepIndex}
              type="button"
              onClick={() => setIndex(stepIndex)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                stepIndex === index
                  ? 'w-8 bg-telegram-primary shadow-sm shadow-telegram-primary/50'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to step ${stepIndex + 1}`}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onOpenHelp}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Open Help & FAQ
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(prev => prev - 1)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => isLastStep ? onFinish() : setIndex(value => value + 1)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-telegram-primary to-sky-400 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-telegram-primary/25 hover:brightness-110 active:scale-95 transition-all text-sm"
            >
              {isLastStep ? (
                <>
                  <span>Finish</span>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5] rtl:rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
