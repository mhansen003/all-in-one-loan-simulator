import { useState } from 'react';
import './FAQSlideout.css';

interface FAQSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is the All-In-One Loan?",
    answer: "The All-In-One loan is a revolutionary 30-year Home Equity Line of Credit (HELOC) that functions as your primary checking account. It calculates interest daily on your effective balance (loan balance minus available cash), allowing you to save significant interest compared to traditional mortgages."
  },
  {
    question: "How does daily interest calculation work?",
    answer: "Unlike traditional mortgages that calculate interest monthly, the All-In-One loan calculates interest daily using the formula: (Loan Balance - Available Cash) × (Annual Rate / 365). This means every dollar you deposit immediately reduces your interest-bearing balance."
  },
  {
    question: "Can I use it as my regular checking account?",
    answer: "Yes! The All-In-One loan comes with full banking features including checks, debit cards, online bill pay, and mobile banking. Your income deposits automatically reduce your loan balance for interest calculation purposes while remaining fully accessible."
  },
  {
    question: "What are the main benefits?",
    answer: "Key benefits include: (1) Significant interest savings through daily balance offsets, (2) Accelerated loan payoff timeline, (3) Full flexibility to access your funds anytime, (4) Simplified finances with one account for mortgage and banking, (5) No prepayment penalties."
  },
  {
    question: "How much can I save?",
    answer: "Savings vary based on your cash flow, but borrowers typically save 30-40% on total interest paid and pay off their mortgage 5-10 years faster. Use our simulator to see your personalized savings based on your actual bank statements."
  },
  {
    question: "Is my money accessible if I need it?",
    answer: "Absolutely! Unlike making extra principal payments on a traditional mortgage, money deposited into your All-In-One loan remains fully accessible. You can write checks, use your debit card, or transfer funds anytime you need them."
  },
  {
    question: "What are the qualification requirements?",
    answer: "Qualification requirements include: (1) Maximum 80% Loan-to-Value ratio, (2) Positive monthly cash flow of at least $500, (3) Good credit score, (4) Sufficient equity in your home. Your loan officer can provide specific qualification details."
  },
  {
    question: "How is this different from a traditional mortgage?",
    answer: "Traditional mortgages calculate interest monthly on the full balance, have fixed payment schedules, and don't allow you to re-access principal payments. The All-In-One loan offers daily interest calculation, flexible access to equity, and the ability to use your cash flow to reduce interest charges."
  },
  {
    question: "Are there any fees or penalties?",
    answer: "The All-In-One loan has no prepayment penalties and no fees for accessing your funds. Standard closing costs apply when setting up the loan. Your loan officer will provide a complete fee disclosure during the application process."
  },
  {
    question: "Who is this loan best suited for?",
    answer: "The All-In-One loan works best for borrowers with positive monthly cash flow who want to optimize their mortgage payoff. It's ideal for those who regularly maintain cash in checking or savings accounts and want that money to work harder for them."
  }
];

export default function FAQSlideout({ isOpen, onClose }: FAQSlideoutProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="faq-backdrop" onClick={onClose}></div>}

      {/* Slideout Panel */}
      <div className={`faq-slideout ${isOpen ? 'open' : ''}`}>
        <div className="faq-header">
          <div>
            <h2>All-In-One Loan FAQ</h2>
            <p>Common questions about the product</p>
          </div>
          <button className="faq-close-btn" onClick={onClose} aria-label="Close FAQ">
            ×
          </button>
        </div>

        <div className="faq-content">
          {faqData.map((item, index) => (
            <div key={index} className="faq-item">
              <button
                className={`faq-question ${expandedIndex === index ? 'active' : ''}`}
                onClick={() => toggleQuestion(index)}
              >
                <span>{item.question}</span>
                <svg
                  className={`faq-chevron ${expandedIndex === index ? 'rotated' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className={`faq-answer ${expandedIndex === index ? 'expanded' : ''}`}>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="faq-footer">
          <p>Have more questions? Contact your loan officer or use the Pitch Guide for AI-powered answers.</p>
        </div>
      </div>
    </>
  );
}
