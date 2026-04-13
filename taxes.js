// This is the final, complete content for taxes.js (with timeout safety check)

document.addEventListener('DOMContentLoaded', () => {
    // --- Loading screen logic ---
    const loadingOverlay = document.getElementById('loading-overlay');
    function hideLoadingScreen() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                if (loadingOverlay && loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 500); // Matches CSS transition time
        }
    }

    const taxesMainContent = document.getElementById('taxes-main-content');
    if (!taxesMainContent) {
        hideLoadingScreen(); 
        return; 
    }

    console.log("taxes.js: Taxes page detected. Initializing logic.");
    let db, firestore;
    let appLogicHasRun_Taxes = false; // Flag to prevent running logic twice

    // --- DOM Elements ---
    const loginContainer = document.getElementById('taxes-login-form-container');
    const loginForm = document.getElementById('taxes-page-login-form');
    const passwordInput = document.getElementById('taxes-page-password');
    const loginError = document.getElementById('taxes-page-login-error');
    const employeeSelect = document.getElementById('employee-tax-select');
    const taxDetailsContainer = document.getElementById('tax-details-container');
    const selectedEmployeeNameDisplay = document.getElementById('selected-employee-name');
    const totalTaxesOwedDisplay = document.getElementById('total-taxes-owed');
    const paidCheckbox = document.getElementById('taxes-paid-checkbox');
    const markPaidButton = document.getElementById('mark-taxes-paid-button');
    const statusMessage = document.getElementById('taxes-status-message');

    let transactionsToClear = [];

    function setupErrorUI_Taxes(errorMessage) {
        if (appLogicHasRun_Taxes) return;
        appLogicHasRun_Taxes = true;
        alert("Critical error on Taxes page: " + errorMessage);
        if (loginForm) {
            const loginButton = loginForm.querySelector('button[type="submit"]');
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = "Login Disabled (DB Error)";
            }
        }
        if (taxesMainContent) taxesMainContent.style.display = 'none';
        hideLoadingScreen();
    }

    function updateTaxesView(isLoggedIn) {
        if (isLoggedIn) {
            loginContainer.style.display = 'none';
            taxesMainContent.style.display = 'block';
            if (typeof addLogoutButton === "function") addLogoutButton();
        } else {
            loginContainer.style.display = 'block';
            taxesMainContent.style.display = 'none';
        }
    }
    
    async function loadEmployeesForTaxes() {
        try {
            const q = firestore.query(firestore.collection(db, "employees"), firestore.orderBy("fullName"));
            const snapshot = await firestore.getDocs(q);
            employeeSelect.innerHTML = '<option value="">-- Select Employee --</option>';
            snapshot.forEach(doc => {
                const emp = doc.data();
                const option = document.createElement('option');
                option.value = emp.fullName;
                option.textContent = emp.fullName;
                employeeSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading employees for taxes:", error);
            employeeSelect.innerHTML = '<option value="">Error loading employees</option>';
        }
    }

    async function fetchAndCalculateTaxes(employeeName) {
        if (!employeeName) {
            taxDetailsContainer.style.display = 'none';
            return;
        }
        selectedEmployeeNameDisplay.textContent = employeeName;
        totalTaxesOwedDisplay.textContent = "Loading...";
        taxDetailsContainer.style.display = 'block';
        statusMessage.textContent = '';
        paidCheckbox.checked = false;
        markPaidButton.disabled = true;

        const transactionCountEl = document.getElementById('transaction-count');

        try {
            const q = firestore.query(
                firestore.collection(db, "transactions"),
                firestore.where("employeeName", "==", employeeName),
                firestore.where("taxesCleared", "==", false)
            );
            const snapshot = await firestore.getDocs(q);
            let totalTaxes = 0;
            transactionsToClear = [];

            if (snapshot.empty) {
                totalTaxesOwedDisplay.textContent = "$0.00";
                if (transactionCountEl) transactionCountEl.textContent = '0';
                statusMessage.textContent = 'No outstanding taxes found for this employee.';
                statusMessage.style.color = 'green';
                paidCheckbox.disabled = true;
                markPaidButton.disabled = true;
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.taxAmountPaidToMikes && typeof data.taxAmountPaidToMikes === 'number') {
                    totalTaxes += data.taxAmountPaidToMikes;
                    transactionsToClear.push(doc.id);
                }
            });

            totalTaxesOwedDisplay.textContent = `$${totalTaxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            if (transactionCountEl) transactionCountEl.textContent = transactionsToClear.length;
            paidCheckbox.disabled = totalTaxes <= 0;
            if (totalTaxes <= 0) {
                statusMessage.textContent = 'No taxable transactions found (Buy/Sell trades are not taxed).';
                statusMessage.style.color = '#a0aec0';
            }
        } catch (error) {
            console.error("Error fetching taxes:", error);
            totalTaxesOwedDisplay.textContent = "Error";
            if (transactionCountEl) transactionCountEl.textContent = '?';
            statusMessage.textContent = 'Error fetching taxes. A database index might be required. Check the console (F12) for a link to create it.';
            statusMessage.style.color = '#e74c3c';
        }
    }

// REPLACE the entire markTaxesAsPaid function in taxes.js with this one

    async function markTaxesAsPaid() {
        if (transactionsToClear.length === 0) {
            alert("No outstanding transactions to mark as paid.");
            return;
        }
        const processingEmployee = employeeSelect.value;
        if (!processingEmployee) {
            alert("Please ensure an employee is selected.");
            return;
        }
        markPaidButton.disabled = true;
        statusMessage.textContent = 'Processing...';
        statusMessage.style.color = '#f0f0f0';
        try {
            // Update all outstanding transactions
            const updatePromises = transactionsToClear.map(id => {
                const docRef = firestore.doc(db, "transactions", id);
                return firestore.updateDoc(docRef, { taxesCleared: true });
            });
            await Promise.all(updatePromises);
            
            // Create a log entry
            const totalAmount = parseFloat(totalTaxesOwedDisplay.textContent.replace(/[$,]/g, ''));
            await firestore.addDoc(firestore.collection(db, "taxPaymentLogs"), {
                employeeName: processingEmployee,
                processingEmployeeName: processingEmployee,
                totalAmountCleared: totalAmount,
                transactionIdsCleared: transactionsToClear,
                clearedAt: firestore.serverTimestamp()
            });

            statusMessage.textContent = 'Taxes successfully marked as paid!';
            statusMessage.style.color = 'green';

            // Update the display to zero for instant feedback
            totalTaxesOwedDisplay.textContent = "$0.00"; 
            totalTaxesOwedDisplay.style.color = "green";
            
            // Disable the controls since the balance is now zero
            paidCheckbox.checked = false;
            paidCheckbox.disabled = true;
            markPaidButton.disabled = true;

            // The setTimeout block that caused the reset has been removed.
            // The view will now stay on the current employee.

        } catch (error) {
            console.error("Error marking taxes as paid:", error);
            statusMessage.textContent = 'An error occurred. Please try again.';
            statusMessage.style.color = '#e74c3c';
            markPaidButton.disabled = false; // Re-enable button on error
        }
    }

    employeeSelect.addEventListener('change', (e) => fetchAndCalculateTaxes(e.target.value));
    paidCheckbox.addEventListener('change', () => {
        markPaidButton.disabled = !paidCheckbox.checked || transactionsToClear.length === 0;
    });
    markPaidButton.addEventListener('click', markTaxesAsPaid);

    // --- Main App Logic ---
    async function executeTaxesAppLogic(firebaseDetail) {
        if (appLogicHasRun_Taxes) return;
        appLogicHasRun_Taxes = true;

        if (!firebaseDetail || !firebaseDetail.db || !firebaseDetail.functions) {
            setupErrorUI_Taxes("Firebase details missing.");
            return;
        }

        db = firebaseDetail.db;
        firestore = firebaseDetail.functions;

        if (typeof checkEmployeeSession === 'function' && checkEmployeeSession()) {
            updateTaxesView(true);
            await loadEmployeesForTaxes();
            // Auto-select the logged-in employee if they are in the list
            const loggedInName = localStorage.getItem('loggedInEmployeeName');
            if (loggedInName && employeeSelect) {
                for (let i = 0; i < employeeSelect.options.length; i++) {
                    if (employeeSelect.options[i].value === loggedInName) {
                        employeeSelect.selectedIndex = i;
                        await fetchAndCalculateTaxes(loggedInName);
                        break;
                    }
                }
            }
        } else {
            updateTaxesView(false);
            // Build login dropdown from employee list
            let taxLoginEmployeeList = [];
            try {
                const q = firestore.query(firestore.collection(db, "employees"), firestore.orderBy("fullName"));
                const snap = await firestore.getDocs(q);
                taxLoginEmployeeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) { console.error("Could not load employees for taxes login", e); }

            // Populate the login select
            const taxLoginSelect = document.getElementById('taxes-login-select');
            const taxPasswordGroup = document.getElementById('taxes-password-group');
            const taxLoginSubmitBtn = document.getElementById('taxes-login-submit-btn');

            if (taxLoginSelect) {
                taxLoginSelect.innerHTML = '<option value="">-- Select Your Name --</option>';
                taxLoginEmployeeList.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.textContent = emp.fullName;
                    taxLoginSelect.appendChild(opt);
                });

                taxLoginSelect.addEventListener('change', () => {
                    if (taxLoginSelect.value) {
                        if (taxPasswordGroup) taxPasswordGroup.style.display = 'block';
                        if (taxLoginSubmitBtn) taxLoginSubmitBtn.style.display = 'inline-block';
                        if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
                        if (loginError) loginError.style.display = 'none';
                    } else {
                        if (taxPasswordGroup) taxPasswordGroup.style.display = 'none';
                        if (taxLoginSubmitBtn) taxLoginSubmitBtn.style.display = 'none';
                    }
                });
            }

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const selectedId = taxLoginSelect ? taxLoginSelect.value : '';
                const enteredPassword = passwordInput ? passwordInput.value : '';
                if (!selectedId) return;
                const emp = taxLoginEmployeeList.find(em => em.id === selectedId);
                if (emp && emp.loginPassword && emp.loginPassword === enteredPassword) {
                    if (typeof grantEmployeeSession === "function") grantEmployeeSession();
                    localStorage.setItem('loggedInEmployeeName', emp.fullName);
                    updateTaxesView(true);
                    await loadEmployeesForTaxes();
                    // Auto-select the logged-in employee
                    for (let i = 0; i < employeeSelect.options.length; i++) {
                        if (employeeSelect.options[i].value === emp.fullName) {
                            employeeSelect.selectedIndex = i;
                            await fetchAndCalculateTaxes(emp.fullName);
                            break;
                        }
                    }
                } else {
                    if (loginError) { loginError.textContent = "Incorrect password. Please try again."; loginError.style.display = 'block'; }
                    if (passwordInput) passwordInput.value = '';
                }
            });
        }
        hideLoadingScreen();
    }
    
    // --- Firebase Initialization Listeners & Timeout ---
    let firebaseReadyProcessed_Taxes = false;

    document.addEventListener('firebaseReady', (e) => {
        if (!firebaseReadyProcessed_Taxes) {
            firebaseReadyProcessed_Taxes = true;
            executeTaxesAppLogic(e.detail);
        }
    });
    
    document.addEventListener('firebaseError', (e) => {
        if (!firebaseReadyProcessed_Taxes) {
            firebaseReadyProcessed_Taxes = true;
            setupErrorUI_Taxes(e.detail?.error?.message || "Firebase Error");
        }
    });

    // Timeout fallback in case events are missed
    setTimeout(() => {
        if (!firebaseReadyProcessed_Taxes) {
            if (window.isFirebaseReady && window.db && window.firestoreFunctions) {
                console.log("Taxes.js: Timeout reached, but Firebase is ready. Initializing manually.");
                executeTaxesAppLogic({ db: window.db, functions: window.firestoreFunctions });
            } else {
                console.error("Taxes.js: Timeout reached and Firebase is NOT ready.");
                setupErrorUI_Taxes("Initialization timeout. Firebase failed to load.");
            }
        }
    }, 3500); // 3.5 second safety net
});