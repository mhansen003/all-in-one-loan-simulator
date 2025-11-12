import './AIExtractionModal.css';

interface AIExtractionModalProps {
  onClose: () => void;
}

export default function AIExtractionModal({ onClose }: AIExtractionModalProps) {
  return (
    <div
      className="ai-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ai-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ai-modal-header">
          <div>
            <h2>🤖 How AI Analyzes Bank Statements</h2>
            <p>Understanding the automated categorization process</p>
          </div>
          <button
            className="ai-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="ai-modal-body">

          {/* Overview Section */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">📋</span>
              <h3>The Four Categories</h3>
            </div>
            <p>Every transaction is automatically sorted into one of four categories:</p>

            <div className="ai-category-grid">
              <div className="ai-category-card income">
                <div className="ai-category-badge">✅ Income</div>
                <p><strong>Regular paychecks only</strong></p>
                <p className="ai-note">Included in monthly totals</p>
              </div>

              <div className="ai-category-card expense">
                <div className="ai-category-badge">💳 Expenses</div>
                <p><strong>All recurring bills & purchases</strong></p>
                <p className="ai-note">Included in monthly totals</p>
              </div>

              <div className="ai-category-card housing">
                <div className="ai-category-badge">🏠 Housing</div>
                <p><strong>Mortgage or rent payments</strong></p>
                <p className="ai-note">Tracked separately</p>
              </div>

              <div className="ai-category-card one-time">
                <div className="ai-category-badge">⚡ One-Time</div>
                <p><strong>Irregular income or expenses</strong></p>
                <p className="ai-note">Auto-excluded from totals</p>
              </div>
            </div>
          </div>

          {/* Income Detection */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">💰</span>
              <h3>How We Detect Regular Income</h3>
            </div>

            <div className="ai-rule-box success">
              <h4>✅ Counts as Regular Income:</h4>
              <ul>
                <li>Payroll deposits with keywords: <strong>PAYROLL, SALARY, DIRECT DEP, PAYCHECK</strong></li>
                <li>Regular deposits every 2 weeks or monthly (same amount)</li>
                <li>Recognizable employer name appearing consistently</li>
              </ul>
            </div>

            <div className="ai-rule-box warning">
              <h4>❌ Does NOT Count as Regular Income:</h4>
              <ul>
                <li><strong>Zelle, Venmo, Cash App, PayPal</strong> - Likely reimbursements</li>
                <li><strong>Wire transfers</strong> - Usually one-time events</li>
                <li><strong>Tax refunds</strong> (IRS, state refunds) - Annual only</li>
                <li><strong>Large irregular deposits</strong> without paycheck pattern</li>
                <li><strong>Bonuses</strong> (unless recurring monthly)</li>
              </ul>
            </div>

            <div className="ai-example">
              <strong>Example:</strong> A $2,500 deposit from "CMG MORTGAGE INC PAYROLL" every other Friday is categorized as <span className="badge-income">Income</span>
            </div>
          </div>

          {/* Housing Detection */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">🏠</span>
              <h3>How We Identify Housing Payments</h3>
            </div>

            <div className="ai-rule-box info">
              <h4>Detection Method:</h4>
              <ul>
                <li>Must have <strong>recurring pattern</strong> (same amount 2+ times)</li>
                <li>Contains keywords: <strong>MORTGAGE, RENT, PROPERTY MGMT, LANDLORD, ESCROW</strong></li>
                <li>Or major lenders: <strong>Chase, Wells Fargo, Quicken Loans, Rocket Mortgage</strong></li>
                <li>Amount matches your stated housing payment (within $50 or 2%)</li>
              </ul>
            </div>

            <div className="ai-example">
              <strong>Example:</strong> A $1,850 payment to "CHASE MORTGAGE" on the 1st of each month is categorized as <span className="badge-housing">Housing</span>
            </div>
          </div>

          {/* Regular Expenses */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">💳</span>
              <h3>What Counts as Regular Expenses</h3>
            </div>

            <div className="ai-expense-grid">
              <div className="ai-expense-category">
                <h4>📱 Utilities & Services</h4>
                <ul>
                  <li>Electric, gas, water</li>
                  <li>Internet, cable, phone</li>
                  <li>Streaming services</li>
                  <li>Monthly subscriptions</li>
                </ul>
              </div>

              <div className="ai-expense-category">
                <h4>🛒 Daily Living</h4>
                <ul>
                  <li>Groceries (Kroger, Safeway, etc.)</li>
                  <li>Gas stations, fuel</li>
                  <li>Regular dining (under $150)</li>
                  <li>Coffee shops</li>
                </ul>
              </div>

              <div className="ai-expense-category">
                <h4>🔄 Recurring Bills</h4>
                <ul>
                  <li>Monthly HOA fees</li>
                  <li>Health insurance premiums</li>
                  <li>Gym memberships</li>
                  <li>Childcare, daycare</li>
                </ul>
              </div>

              <div className="ai-expense-category">
                <h4>💳 Credit Card Payments</h4>
                <ul>
                  <li><strong>Always included as expenses</strong></li>
                  <li>Detects all major issuers</li>
                  <li>Recurring monthly obligation</li>
                  <li>Never flagged as one-time</li>
                </ul>
              </div>
            </div>

            <div className="ai-example">
              <strong>Example:</strong> A $150 payment to "Spectrum Internet" and a $1,200 payment to "Chase Card" are both <span className="badge-expense">Expenses</span>
            </div>
          </div>

          {/* One-Time Transactions */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">⚡</span>
              <h3>One-Time Transactions (Auto-Excluded)</h3>
            </div>

            <p>These are automatically flagged and excluded from monthly calculations:</p>

            <div className="ai-onetime-grid">
              <div className="ai-onetime-card">
                <h4>💸 Large Purchases (&gt;$500)</h4>
                <ul>
                  <li>Electronics (Apple, Best Buy)</li>
                  <li>Furniture, appliances</li>
                  <li>Home improvement (Home Depot, Lowe's)</li>
                  <li>Major retail purchases</li>
                </ul>
              </div>

              <div className="ai-onetime-card">
                <h4>✈️ Travel & Vacation</h4>
                <ul>
                  <li>Hotels, Airbnb, VRBO</li>
                  <li>Flights, airlines</li>
                  <li>Cruise lines</li>
                  <li>Vacation rentals</li>
                </ul>
              </div>

              <div className="ai-onetime-card">
                <h4>📅 Annual/Irregular Bills</h4>
                <ul>
                  <li>Annual insurance premiums</li>
                  <li>Property tax payments</li>
                  <li>HOA special assessments</li>
                  <li>Annual memberships</li>
                </ul>
              </div>

              <div className="ai-onetime-card">
                <h4>🔀 Financial Movements</h4>
                <ul>
                  <li>Wire transfers (in or out)</li>
                  <li>Investment transfers</li>
                  <li>Large ATM withdrawals (&gt;$500)</li>
                  <li>P2P payments (Zelle, Venmo)</li>
                </ul>
              </div>
            </div>

            <div className="ai-important-note">
              <strong>💡 Why This Matters:</strong> One-time transactions are excluded because they don't represent recurring monthly cash flow. This gives you a more accurate picture of the borrower's true monthly financial situation.
            </div>
          </div>

          {/* Special Rules */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">⚙️</span>
              <h3>Special Rules & Considerations</h3>
            </div>

            <div className="ai-special-rules">
              <div className="ai-rule-item">
                <div className="ai-rule-number">1</div>
                <div className="ai-rule-content">
                  <h4>Recurring Pattern Priority</h4>
                  <p>If the <strong>same amount</strong> appears 2+ times, it's likely recurring. The AI checks this first to avoid incorrectly flagging regular bills as one-time expenses.</p>
                </div>
              </div>

              <div className="ai-rule-item">
                <div className="ai-rule-number">2</div>
                <div className="ai-rule-content">
                  <h4>Credit Card Payments</h4>
                  <p><strong>Always treated as recurring expenses</strong>, even if amounts vary. Detects payments to: Chase, Amex, Capital One, Citi, Discover, Bank of America, Wells Fargo, and more.</p>
                </div>
              </div>

              <div className="ai-rule-item">
                <div className="ai-rule-number">3</div>
                <div className="ai-rule-content">
                  <h4>Partial Month Detection</h4>
                  <p>First and last months with limited data are automatically detected and excluded from monthly averages to prevent underestimation.</p>
                </div>
              </div>

              <div className="ai-rule-item">
                <div className="ai-rule-number">4</div>
                <div className="ai-rule-content">
                  <h4>Automatic Deduplication</h4>
                  <p>If you upload overlapping bank statements, duplicate transactions are automatically removed to prevent double-counting.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-icon">📊</span>
              <h3>Understanding the Confidence Score</h3>
            </div>

            <p>The confidence score (30%-99%) reflects data quality based on:</p>

            <div className="ai-confidence-factors">
              <div className="ai-confidence-item">
                <div className="ai-confidence-weight">40%</div>
                <div>
                  <strong>AI Classification Accuracy</strong>
                  <p>How confident the AI is in its categorization decisions</p>
                </div>
              </div>

              <div className="ai-confidence-item">
                <div className="ai-confidence-weight">20%</div>
                <div>
                  <strong>Transaction Count</strong>
                  <p>More transactions = more reliable patterns (capped at 100)</p>
                </div>
              </div>

              <div className="ai-confidence-item">
                <div className="ai-confidence-weight">20%</div>
                <div>
                  <strong>Flagged Ratio</strong>
                  <p>Lower percentage of one-time transactions = higher confidence</p>
                </div>
              </div>

              <div className="ai-confidence-item">
                <div className="ai-confidence-weight">10%</div>
                <div>
                  <strong>Number of Months</strong>
                  <p>Multiple months of data = better pattern detection</p>
                </div>
              </div>

              <div className="ai-confidence-item">
                <div className="ai-confidence-weight">10%</div>
                <div>
                  <strong>Income Consistency</strong>
                  <p>Regular paycheck patterns boost confidence</p>
                </div>
              </div>
            </div>

            <div className="ai-confidence-guide">
              <h4>Score Interpretation:</h4>
              <div className="ai-confidence-scale">
                <div className="ai-confidence-range excellent">
                  <strong>90-99%</strong> Excellent - High transaction count, clear patterns
                </div>
                <div className="ai-confidence-range good">
                  <strong>80-89%</strong> Very Good - Good data quality with consistent income
                </div>
                <div className="ai-confidence-range fair">
                  <strong>70-79%</strong> Good - Adequate data with some irregularity
                </div>
                <div className="ai-confidence-range low">
                  <strong>60-69%</strong> Fair - Limited data or significant irregular activity
                </div>
                <div className="ai-confidence-range poor">
                  <strong>Below 60%</strong> Marginal - Request additional statements
                </div>
              </div>
            </div>
          </div>

          {/* Final Note */}
          <div className="ai-section ai-final-note">
            <div className="ai-section-header">
              <span className="ai-icon">✅</span>
              <h3>Review & Override</h3>
            </div>
            <p>
              While the AI is highly accurate, <strong>you always have control</strong>. Review the categorized transactions and:
            </p>
            <ul>
              <li>✏️ <strong>Edit amounts</strong> by clicking on any transaction</li>
              <li>☑️ <strong>Exclude/include</strong> transactions using the checkboxes</li>
              <li>➕ <strong>Add missing transactions</strong> manually if needed</li>
            </ul>
            <p>
              The monthly totals automatically recalculate in real-time as you make changes.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          <button
            className="ai-modal-button"
            onClick={onClose}
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
