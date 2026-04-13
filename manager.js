document.addEventListener('DOMContentLoaded', () => {
    // --- START: Loading screen logic ---
    const loadingOverlay = document.getElementById('loading-overlay');
    function hideLoadingScreen() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
    // --- END: Loading screen logic ---

    console.log("manager.js: DOMContentLoaded fired. Waiting for firebaseReady event...");
    let appLogicHasRun_Manager = false;
    let db_manager, firestore_manager;

    const managerLoginWrapper_el = document.getElementById('manager-login-wrapper');
    const managerLoginForm_el = document.getElementById('manager-page-login-form');
    const managerPasswordInput_el = document.getElementById('manager-page-password');
    const managerLoginError_el = document.getElementById('manager-page-login-error');
    const managerMainContent_el = document.getElementById('manager-content');

    let transactionsDiv, exportButton, employeeFormContainer, employeeFormTitle, editEmployeeIdInput,
        employeeFullNameInput, employeeNumberInputSsn, employeeRankSelect, employeeBankAccountInput,
        saveEmployeeButton, cancelEditButton, employeeListDisplay, hacMemberEditFormContainer,
        hacMemberEditFormTitle, editHacMemberIdInput_ManagerPage, hacFirstNameInput_ManagerPage,
        hacLastNameInput_ManagerPage, hacPhoneNumberInput_ManagerPage, hacDriverLicenseInput_ManagerPage,
        hacEmailInput_ManagerPage, saveHacMemberButton_ManagerPage, cancelEditHacMemberButton_ManagerPage,
        hacMemberListDisplay, hacSearchTermInput, hacSearchButton, hacClearSearchButton,
        currentEmployeePasswordDisplay, newEmployeePasswordInput, saveEmployeePasswordButton,
        employeePasswordStatus, hacPromoMonthInput, hacPromoTextInput, saveHacPromoButton,
        hacPromoStatus, resetHacEligibilityButton, hacResetStatus, taxPaymentLogsDisplay_el, exportTaxLogsButton_el,
        posItemFormTitle_el, editPosItemIdInput_el, posItemNameInput_el, posItemPriceInput_el, posItemImageUrlInput_el,
        posItemCategorySelect_el, savePosItemButton_el, cancelEditPosItemButton_el, posItemListDisplay_el, posItemStatusMessage_el;

    function setupErrorUI_Manager(errorMessage) {
        if (appLogicHasRun_Manager && !errorMessage.includes("Manually initializing")) return;
        appLogicHasRun_Manager = true;
        console.error("manager.js: Firebase critical error state:", errorMessage);
        alert("Critical error for Manager Portal: " + errorMessage);
        if (managerLoginForm_el) {
            const managerLoginButtonEl = managerLoginForm_el.querySelector('button[type="submit"]');
            if (managerLoginButtonEl) {
                managerLoginButtonEl.disabled = true;
                managerLoginButtonEl.textContent = "Login Disabled (DB Error)";
            }
        }
        if (managerMainContent_el) managerMainContent_el.style.display = 'none';
        hideLoadingScreen(); // Hide loading screen even on error
    }

    function updateManagerView(isManagerLoggedIn) {
        console.log("manager.js: updateManagerView called with isManagerLoggedIn:", isManagerLoggedIn);
        if (isManagerLoggedIn) {
            if (managerLoginWrapper_el) managerLoginWrapper_el.style.display = 'none';
            if (managerMainContent_el) managerMainContent_el.style.display = 'block';
            if (managerLoginError_el) managerLoginError_el.style.display = 'none';
            if (typeof addLogoutButton === "function") addLogoutButton(); else console.error("Manager: addLogoutButton (from utility.js) is not defined!");
        } else {
            if (managerLoginWrapper_el) managerLoginWrapper_el.style.display = 'block';
            if (managerMainContent_el) managerMainContent_el.style.display = 'none';
            if (typeof checkEmployeeSession === "function" && checkEmployeeSession() && !(typeof checkManagerSession === "function" && checkManagerSession())) {
                if (managerLoginError_el) {
                     managerLoginError_el.textContent = "Manager credentials required.";
                     managerLoginError_el.style.display = 'block';
                }
            }
        }
    }

    async function executeManagerAppLogic(firebaseDetail) {
        if (appLogicHasRun_Manager) { return; }

        if (!firebaseDetail || !firebaseDetail.db || !firebaseDetail.functions) {
            if (window.isFirebaseReady && window.db && window.firestoreFunctions) {
                firebaseDetail = { db: window.db, functions: window.firestoreFunctions };
            } else { setupErrorUI_Manager("Firebase details not available for manager app logic."); return; }
        }
        appLogicHasRun_Manager = true;
        console.log("manager.js: Running executeManagerAppLogic.");

        db_manager = firebaseDetail.db;
        firestore_manager = firebaseDetail.functions;

        if (!firestore_manager.collection || !firestore_manager.doc || !firestore_manager.getDoc || !firestore_manager.Timestamp) {
            setupErrorUI_Manager("Essential Firestore functions (or Timestamp) missing."); return;
        }
        console.log("manager.js: Firestore DB and functions successfully obtained for manager.");

        transactionsDiv = document.getElementById('transactions');
        exportButton = document.getElementById('export');
        employeeFormContainer = document.getElementById('employee-form-container');
        employeeFormTitle = document.getElementById('employee-form-title');
        editEmployeeIdInput = document.getElementById('edit-employee-id');
        employeeFullNameInput = document.getElementById('employee-full-name');
        employeeNumberInputSsn = document.getElementById('employee-number-ssn');
        employeeRankSelect = document.getElementById('employee-rank-select');
        employeeBankAccountInput = document.getElementById('employee-bank-account');
        saveEmployeeButton = document.getElementById('save-employee-button');
        cancelEditButton = document.getElementById('cancel-edit-button');
        employeeListDisplay = document.getElementById('employee-list-display');
        hacMemberEditFormContainer = document.getElementById('hac-member-form-container');
        hacMemberEditFormTitle = document.getElementById('hac-member-form-title');
        editHacMemberIdInput_ManagerPage = document.getElementById('edit-hac-member-id');
        hacFirstNameInput_ManagerPage = document.getElementById('hac-first-name');
        hacLastNameInput_ManagerPage = document.getElementById('hac-last-name');
        hacPhoneNumberInput_ManagerPage = document.getElementById('hac-phone-number');
        hacDriverLicenseInput_ManagerPage = document.getElementById('hac-driver-license');
        hacEmailInput_ManagerPage = document.getElementById('hac-email');
        saveHacMemberButton_ManagerPage = document.getElementById('save-hac-member-button');
        cancelEditHacMemberButton_ManagerPage = document.getElementById('cancel-edit-hac-member-button');
        hacMemberListDisplay = document.getElementById('hac-member-list-display');
        hacSearchTermInput = document.getElementById('hac-search-term');
        hacSearchButton = document.getElementById('hac-search-button');
        hacClearSearchButton = document.getElementById('hac-clear-search-button');
        currentEmployeePasswordDisplay = document.getElementById('current-employee-password-display');
        newEmployeePasswordInput = document.getElementById('new-employee-password');
        saveEmployeePasswordButton = document.getElementById('save-employee-password-button');
        employeePasswordStatus = document.getElementById('employee-password-status');
        hacPromoMonthInput = document.getElementById('hac-promo-month');
        hacPromoTextInput = document.getElementById('hac-promo-text');
        saveHacPromoButton = document.getElementById('save-hac-promo-button');
        hacPromoStatus = document.getElementById('hac-promo-status');
        resetHacEligibilityButton = document.getElementById('reset-hac-eligibility-button');
        hacResetStatus = document.getElementById('hac-reset-status');
        taxPaymentLogsDisplay_el = document.getElementById('tax-payment-logs-display');
        exportTaxLogsButton_el = document.getElementById('export-tax-logs');
        
        posItemFormTitle_el = document.getElementById('pos-item-form-title');
        editPosItemIdInput_el = document.getElementById('edit-pos-item-id');
        posItemNameInput_el = document.getElementById('pos-item-name');
        posItemPriceInput_el = document.getElementById('pos-item-price');
        posItemImageUrlInput_el = document.getElementById('pos-item-image-url');
        posItemCategorySelect_el = document.getElementById('pos-item-category-select');
        savePosItemButton_el = document.getElementById('save-pos-item-button');
        cancelEditPosItemButton_el = document.getElementById('cancel-edit-pos-item-button');
        posItemListDisplay_el = document.getElementById('pos-item-list-display');
        posItemStatusMessage_el = document.getElementById('pos-item-status-message');

        const MANAGER_LOGIN_PASSWORD_HARDCODED = "MikesAdmin";
        let employees_mgr = [];
        let editingEmployeeId_mgr = null;
        let posItems_mgr = [];
        let editingPosItemId_mgr = null;
        let hacMembers_mgr = [];
        let editingHacMemberId_mgr_page = null;
        const HAC_PROMO_DOC_ID_MGR = "hacConfiguration";
        let transactionsFromFirestore_mgr = [];
        let taxPaymentLogsData_mgr = [];

        // --- START POS ITEM MANAGEMENT FUNCTIONS ---
        function setPosItemStatus(message, isError = false) {
            if (!posItemStatusMessage_el) return;
            posItemStatusMessage_el.textContent = message;
            posItemStatusMessage_el.style.color = isError ? '#e74c3c' : 'limegreen';
            setTimeout(() => { posItemStatusMessage_el.textContent = ''; }, 4000);
        }

        async function loadPosItems_ManagerPage() {
            try {
                const q = firestore_manager.query(firestore_manager.collection(db_manager, "posItems"), firestore_manager.orderBy("name"));
                const snap = await firestore_manager.getDocs(q);
                posItems_mgr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderPosItems_ManagerPage();
            } catch (e) {
                console.error("manager.js: Error loading POS items", e);
                if (posItemListDisplay_el) posItemListDisplay_el.innerHTML = "<p><i>Error loading POS items. Check Firestore rules.</i></p>";
            }
        }

        function renderPosItems_ManagerPage() {
            if (!posItemListDisplay_el) return;
            posItemListDisplay_el.innerHTML = '';
            if (posItems_mgr.length === 0) {
                posItemListDisplay_el.innerHTML = "<p><i>No custom POS items added yet.</i></p>";
                return;
            }
            posItems_mgr.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'employee-list-item'; // Reusing style
                itemDiv.innerHTML = `
                    <div class="employee-details">
                        <img src="${item.imageUrl || 'placeholder.png'}" alt="${item.name}" style="width: 40px; height: 40px; border-radius: 4px; margin-right: 10px; vertical-align: middle;">
                        <strong>${item.name}</strong> - $${item.price} (${item.category})
                    </div>
                    <div class="action-buttons-cell">
                        <button class="edit-pos-item-btn action-button" data-id="${item.id}">Edit</button>
                        <button class="remove-pos-item-btn action-button" data-id="${item.id}">Remove</button>
                    </div>`;
                posItemListDisplay_el.appendChild(itemDiv);
            });

            posItemListDisplay_el.querySelectorAll('.edit-pos-item-btn').forEach(b => b.addEventListener('click', e => prepareEditPosItem_ManagerPage(e.target.dataset.id)));
            posItemListDisplay_el.querySelectorAll('.remove-pos-item-btn').forEach(b => b.addEventListener('click', async e => { if (confirm('Are you sure you want to remove this item?')) await removePosItem_ManagerPage(e.target.dataset.id); }));
        }

        function resetPosItemForm_ManagerPage() {
            if (posItemFormTitle_el) posItemFormTitle_el.textContent = "Add New POS Item";
            if (editPosItemIdInput_el) editPosItemIdInput_el.value = '';
            if (posItemNameInput_el) posItemNameInput_el.value = '';
            if (posItemPriceInput_el) posItemPriceInput_el.value = '';
            if (posItemImageUrlInput_el) posItemImageUrlInput_el.value = '';
            if (posItemCategorySelect_el) posItemCategorySelect_el.value = 'General';
            editingPosItemId_mgr = null;
            if (savePosItemButton_el) savePosItemButton_el.textContent = 'Add Item';
            if (cancelEditPosItemButton_el) cancelEditPosItemButton_el.style.display = 'none';
        }
        
        function prepareEditPosItem_ManagerPage(id) {
            const item = posItems_mgr.find(i => i.id === id);
            if (!item) return;
            editingPosItemId_mgr = id;
            if (posItemFormTitle_el) posItemFormTitle_el.textContent = `Edit: ${item.name}`;
            if (editPosItemIdInput_el) editPosItemIdInput_el.value = id;
            if (posItemNameInput_el) posItemNameInput_el.value = item.name;
            if (posItemPriceInput_el) posItemPriceInput_el.value = item.price;
            if (posItemImageUrlInput_el) posItemImageUrlInput_el.value = item.imageUrl;
            if (posItemCategorySelect_el) posItemCategorySelect_el.value = item.category;
            if (savePosItemButton_el) savePosItemButton_el.textContent = 'Save Changes';
            if (cancelEditPosItemButton_el) cancelEditPosItemButton_el.style.display = 'inline-block';
            document.getElementById('pos-item-form-container')?.scrollIntoView({ behavior: 'smooth' });
        }
        
        async function saveOrUpdatePosItem_ManagerPage() {
            const name = posItemNameInput_el.value.trim();
            const price = parseFloat(posItemPriceInput_el.value);
            const imageUrl = posItemImageUrlInput_el.value.trim();
            const category = posItemCategorySelect_el.value;

            if (!name || isNaN(price) || price <= 0) {
                setPosItemStatus("Name and a valid price are required.", true);
                return;
            }

            const itemData = { name, price, imageUrl, category };
            try {
                if (editingPosItemId_mgr) {
                    await firestore_manager.updateDoc(firestore_manager.doc(db_manager, "posItems", editingPosItemId_mgr), itemData);
                    setPosItemStatus("Item updated successfully!");
                } else {
                    await firestore_manager.addDoc(firestore_manager.collection(db_manager, "posItems"), itemData);
                    setPosItemStatus("Item added successfully!");
                }
                resetPosItemForm_ManagerPage();
                await loadPosItems_ManagerPage();
            } catch (e) {
                console.error("Error saving POS item:", e);
                setPosItemStatus(`Error: ${e.message}`, true);
            }
        }

        async function removePosItem_ManagerPage(id) {
            try {
                await firestore_manager.deleteDoc(firestore_manager.doc(db_manager, "posItems", id));
                setPosItemStatus("Item removed.");
                if (editingPosItemId_mgr === id) {
                    resetPosItemForm_ManagerPage();
                }
                await loadPosItems_ManagerPage();
            } catch (e) {
                console.error("Error removing POS item:", e);
                setPosItemStatus(`Error removing item: ${e.message}`, true);
            }
        }
        // --- END POS ITEM MANAGEMENT FUNCTIONS ---

        // Shared password functions removed - passwords are now set per-employee via the employee form
        async function loadEmployees_ManagerPage() {
            try {
                const q = firestore_manager.query(firestore_manager.collection(db_manager, "employees"), firestore_manager.orderBy("fullName"));
                const snap = await firestore_manager.getDocs(q); employees_mgr = []; snap.forEach(d => employees_mgr.push({ id: d.id, ...d.data() }));
                renderEmployeeList_ManagerPage();
            } catch (e) { console.error(e); employees_mgr = []; }
        }
        
        async function updateEmployeeTaxReward(employeeId, rewardData) {
            try {
                const employeeDocRef = firestore_manager.doc(db_manager, "employees", employeeId);
                await firestore_manager.updateDoc(employeeDocRef, {
                    taxReward: rewardData
                });
                console.log(`Successfully updated tax reward for ${employeeId}`);
            } catch (error) {
                console.error("Error updating tax reward:", error);
                alert("Could not update tax reward. Please check console and try again.");
            }
        }

        function renderEmployeeList_ManagerPage() {
            if (!employeeListDisplay) return;
            employeeListDisplay.innerHTML = '';
            employees_mgr.sort((a, b) => a.fullName.localeCompare(b.fullName));

            if (employees_mgr.length === 0) {
                employeeListDisplay.innerHTML = "<p><i>No employees found.</i></p>";
                return;
            }

            employees_mgr.forEach(emp => {
                const taxReward = emp.taxReward || { isActive: false, endDate: null };
                const isChecked = taxReward.isActive ? 'checked' : '';
                
                let endDateString = '';
                if (taxReward.endDate && taxReward.endDate.toDate) {
                    const d = taxReward.endDate.toDate();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    endDateString = `${d.getFullYear()}-${month}-${day}`;
                }

                const li = document.createElement('div');
                li.className = 'employee-list-item';
                li.innerHTML = `
                    <div class="employee-details">
                        <strong>${emp.fullName}</strong> (Num: ${emp.employeeNumber || 'N/A'}) - Rank: ${emp.rank}
                        ${emp.isManager ? '<span style="background:#c05621; color:#fff; font-size:0.75rem; padding:2px 7px; border-radius:4px; margin-left:6px;">MANAGER ACCESS</span>' : ''}
                        <br>Bank Acc: ${emp.bankAccountNumber || 'N/A'}
                        <br><span style="color:#a0aec0; font-size:0.85rem;">Login Password: ${emp.loginPassword ? '<span style="color:limegreen;">Set</span>' : '<span style="color:#e74c3c;">Not Set</span>'}</span>
                    </div>
                    <div class="action-buttons-cell">
                        <div class="tax-reward-controls">
                            <label class="tax-exempt-label">
                                <input type="checkbox" class="tax-reward-checkbox" data-id="${emp.id}" ${isChecked}>
                                0% Tax Reward
                            </label>
                            <div class="tax-reward-date-wrapper" style="display: ${isChecked ? 'block' : 'none'};">
                                <label for="date-input-${emp.id}">Select end date:</label>
                                <input type="date" class="tax-reward-end-date" id="date-input-${emp.id}" data-id="${emp.id}" value="${endDateString}">
                            </div>
                        </div>
                        <button class="edit-employee-btn action-button" data-id="${emp.id}">Edit</button>
                        <button class="remove-employee-btn action-button" data-id="${emp.id}">Remove</button>
                    </div>`;
                employeeListDisplay.appendChild(li);
            });

            employeeListDisplay.querySelectorAll('.edit-employee-btn').forEach(b => b.addEventListener('click', e => prepareEditEmployee_ManagerPage(e.target.dataset.id)));
            employeeListDisplay.querySelectorAll('.remove-employee-btn').forEach(b => b.addEventListener('click', async e => { if (confirm('Are you sure you want to remove this employee?')) await removeEmployee_ManagerPage(e.target.dataset.id); }));
            
            employeeListDisplay.querySelectorAll('.tax-reward-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const employeeId = e.target.dataset.id;
                    const isActive = e.target.checked;
                    const controlsDiv = e.target.closest('.tax-reward-controls');
                    const dateWrapper = controlsDiv.querySelector('.tax-reward-date-wrapper');
                    const dateInput = controlsDiv.querySelector('.tax-reward-end-date');

                    if (dateWrapper) {
                        dateWrapper.style.display = isActive ? 'block' : 'none';
                    }
                    
                    const endDate = isActive && dateInput.value ? new Date(dateInput.value + 'T00:00:00') : null;
                    
                    updateEmployeeTaxReward(employeeId, { isActive, endDate });
                });
            });

            employeeListDisplay.querySelectorAll('.tax-reward-end-date').forEach(dateInput => {
                dateInput.addEventListener('change', (e) => {
                    const employeeId = e.target.dataset.id;
                    const checkbox = e.target.closest('.tax-reward-controls').querySelector('.tax-reward-checkbox');
                    const isActive = checkbox.checked;
                    const endDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;

                    updateEmployeeTaxReward(employeeId, { isActive, endDate });
                });
            });
        }
        
        function resetEmployeeForm_ManagerPage() {
            if(employeeFormTitle) employeeFormTitle.textContent = "Add New Employee";
            if(editEmployeeIdInput) editEmployeeIdInput.value = '';
            if(employeeFullNameInput) employeeFullNameInput.value = '';
            if(employeeNumberInputSsn) employeeNumberInputSsn.value = '';
            if(employeeRankSelect) employeeRankSelect.value = 'Trainee';
            if(employeeBankAccountInput) employeeBankAccountInput.value = '';
            const loginPassInput = document.getElementById('employee-login-password');
            if(loginPassInput) loginPassInput.value = '';
            const isManagerCheckbox = document.getElementById('employee-is-manager');
            if(isManagerCheckbox) isManagerCheckbox.checked = false;
            editingEmployeeId_mgr = null;
            if(cancelEditButton) cancelEditButton.style.display = 'none';
            if(saveEmployeeButton) { saveEmployeeButton.textContent = 'Add Employee'; saveEmployeeButton.disabled = false; }
        }
        function prepareEditEmployee_ManagerPage(id) {
            if (!id) { return; }
            const emp = employees_mgr.find(e => e.id === id);
            if (emp) {
                editingEmployeeId_mgr = id;
                if (employeeFormTitle) employeeFormTitle.textContent = "Edit Employee: " + emp.fullName;
                if (editEmployeeIdInput) editEmployeeIdInput.value = emp.id;
                if (employeeFullNameInput) employeeFullNameInput.value = emp.fullName || "";
                if (employeeNumberInputSsn) employeeNumberInputSsn.value = emp.employeeNumber || "";
                if (employeeRankSelect) employeeRankSelect.value = emp.rank || "Trainee";
                if (employeeBankAccountInput) { employeeBankAccountInput.value = emp.bankAccountNumber || ""; }
                const loginPassInput = document.getElementById('employee-login-password');
                if (loginPassInput) loginPassInput.value = ''; // Never pre-fill; leave blank to keep existing
                const isManagerCheckbox = document.getElementById('employee-is-manager');
                if (isManagerCheckbox) isManagerCheckbox.checked = emp.isManager === true;
                if (saveEmployeeButton) { saveEmployeeButton.textContent = 'Save Changes'; saveEmployeeButton.disabled = false; }
                if (cancelEditButton) cancelEditButton.style.display = 'inline-block';
                if (employeeFormContainer && typeof employeeFormContainer.scrollIntoView === "function") employeeFormContainer.scrollIntoView({ behavior: 'smooth' });
                if (employeeFullNameInput) employeeFullNameInput.focus();
            } else { resetEmployeeForm_ManagerPage(); }
        }
        async function saveOrUpdateEmployee_ManagerPage() {
            const name = employeeFullNameInput.value.trim();
            const number = employeeNumberInputSsn.value.trim();
            const rank = employeeRankSelect.value;
            const bankAccount = employeeBankAccountInput.value.trim();
            const loginPassword = document.getElementById('employee-login-password')?.value.trim() || '';
            const id = editingEmployeeId_mgr;

            if(!name || !number) {alert("Name and Number are required."); return;}
            if(!id && !loginPassword) {alert("A login password is required for new employees."); return;}
            try {
                const empColRef = firestore_manager.collection(db_manager, "employees");
                const isManager = document.getElementById('employee-is-manager')?.checked || false;
                const employeeData = { fullName: name, employeeNumber: number, rank: rank, bankAccountNumber: bankAccount || null, isManager: isManager };
                // Only set/update password if one was entered
                if (loginPassword) { employeeData.loginPassword = loginPassword; }
                
                if(id) {
                    const existingEmp = employees_mgr.find(e => e.id === id);
                    if (existingEmp && existingEmp.taxReward) {
                        employeeData.taxReward = existingEmp.taxReward;
                    }
                } else {
                    employeeData.taxReward = { isActive: false, endDate: null };
                }

                if(id) {
                    if (employees_mgr.some(e => e.employeeNumber === number && e.id !== id)) { alert("An employee with this number already exists."); return; }
                    await firestore_manager.updateDoc(firestore_manager.doc(db_manager, "employees", id), employeeData);
                } else {
                    const q = firestore_manager.query(empColRef, firestore_manager.where("employeeNumber", "==", number));
                    const snap = await firestore_manager.getDocs(q);
                    if (!snap.empty) { alert("An employee with this number already exists."); return; }
                    employeeData.createdAt = firestore_manager.serverTimestamp();
                    await firestore_manager.addDoc(empColRef, employeeData);
                }
                await loadEmployees_ManagerPage(); 
                resetEmployeeForm_ManagerPage();
                alert(id ? "Employee updated successfully!" : "Employee added successfully!");
            } catch(e){ console.error(e); alert("Error saving employee: " + e.message);}
        }
        async function removeEmployee_ManagerPage(id) {
            try { 
                await firestore_manager.deleteDoc(firestore_manager.doc(db_manager, "employees", id)); 
                await loadEmployees_ManagerPage(); 
                if(editingEmployeeId_mgr === id) resetEmployeeForm_ManagerPage(); 
            }
            catch(e) { console.error(e); alert("Error deleting employee.");}
        }
        async function loadHacPromo_ManagerPage() {
            try { const promoDoc = await firestore_manager.getDoc(firestore_manager.doc(db_manager, "siteSettings", HAC_PROMO_DOC_ID_MGR)); if(promoDoc.exists()){ const d = promoDoc.data(); if(hacPromoMonthInput)hacPromoMonthInput.value=d.currentPromoMonth||''; if(hacPromoTextInput)hacPromoTextInput.value=d.currentPromoText||'';}} catch(e){console.error(e);}
        }
        async function saveHacPromo_ManagerPage() {
            const month = hacPromoMonthInput.value.trim(), text = hacPromoTextInput.value.trim(); if(!month||!text){alert("Promo fields req.");return;}
            try{ await firestore_manager.setDoc(firestore_manager.doc(db_manager, "siteSettings", HAC_PROMO_DOC_ID_MGR), {currentPromoMonth:month, currentPromoText:text},{merge:true}); if(hacPromoStatus){hacPromoStatus.textContent="Promo Saved."; setTimeout(()=>hacPromoStatus.textContent='',3000);}}
            catch(e){console.error(e); if(hacPromoStatus)hacPromoStatus.textContent="Error.";}
        }
        function resetHacMemberForm_ManagerPage() {
            if(hacMemberEditFormTitle) hacMemberEditFormTitle.textContent = "Edit HAC Member"; if(editHacMemberIdInput_ManagerPage) editHacMemberIdInput_ManagerPage.value = '';
            if(hacFirstNameInput_ManagerPage) hacFirstNameInput_ManagerPage.value = ''; if(hacLastNameInput_ManagerPage) hacLastNameInput_ManagerPage.value = '';
            if(hacPhoneNumberInput_ManagerPage) hacPhoneNumberInput_ManagerPage.value = ''; if(hacDriverLicenseInput_ManagerPage) hacDriverLicenseInput_ManagerPage.value = '';
            if(hacEmailInput_ManagerPage) hacEmailInput_ManagerPage.value = ''; editingHacMemberId_mgr_page = null;
            if(hacMemberEditFormContainer) hacMemberEditFormContainer.style.display='none'; if(saveHacMemberButton_ManagerPage) saveHacMemberButton_ManagerPage.disabled = true;
            if(cancelEditHacMemberButton_ManagerPage) cancelEditHacMemberButton_ManagerPage.style.display='none';
        }
        function prepareEditHacMember_ManagerPage(memberId) {
            const mem = hacMembers_mgr.find(m => m.id === memberId); if(!mem) {console.error("HAC mem not in cache:",memberId);return;} editingHacMemberId_mgr_page = memberId;
            if(hacMemberEditFormTitle) hacMemberEditFormTitle.textContent = `Edit: ${mem.firstName} ${mem.lastName}`; if(editHacMemberIdInput_ManagerPage) editHacMemberIdInput_ManagerPage.value = mem.id;
            if(hacFirstNameInput_ManagerPage) hacFirstNameInput_ManagerPage.value = mem.firstName || ''; if(hacLastNameInput_ManagerPage) hacLastNameInput_ManagerPage.value = mem.lastName || '';
            if(hacPhoneNumberInput_ManagerPage) hacPhoneNumberInput_ManagerPage.value = mem.phoneNumber || ''; if(hacDriverLicenseInput_ManagerPage) hacDriverLicenseInput_ManagerPage.value = mem.driverLicense || '';
            if(hacEmailInput_ManagerPage) hacEmailInput_ManagerPage.value = mem.email || ''; if(hacMemberEditFormContainer) hacMemberEditFormContainer.style.display = 'block';
            if(saveHacMemberButton_ManagerPage) saveHacMemberButton_ManagerPage.disabled = false; if(cancelEditHacMemberButton_ManagerPage) cancelEditHacMemberButton_ManagerPage.style.display = 'inline-block';
        }
        async function saveOrUpdateHacMember_ManagerPage() {
            if(!editingHacMemberId_mgr_page) return; const data = { firstName: hacFirstNameInput_ManagerPage.value.trim(), lastName: hacLastNameInput_ManagerPage.value.trim(), phoneNumber: hacPhoneNumberInput_ManagerPage.value.trim()||null, driverLicense: hacDriverLicenseInput_ManagerPage.value.trim()||null, email: hacEmailInput_ManagerPage.value.trim().toLowerCase()||null }; if(!data.firstName || !data.lastName){alert("Name req.");return;} try { await firestore_manager.updateDoc(firestore_manager.doc(db_manager, "hacMembers", editingHacMemberId_mgr_page), data); alert("HAC updated."); await searchHacMembers_ManagerPage(); resetHacMemberForm_ManagerPage(); } catch(e) {console.error(e); alert("HAC update err.");}
        }
        async function removeHacMember_ManagerPage(memberId) {
             try { await firestore_manager.deleteDoc(firestore_manager.doc(db_manager, "hacMembers", memberId)); alert("HAC removed."); await searchHacMembers_ManagerPage(); if(editingHacMemberId_mgr_page===memberId)resetHacMemberForm_ManagerPage(); }
             catch(e){console.error(e); alert("HAC delete err.");}
        }
        async function searchHacMembers_ManagerPage() {
            if (!hacSearchTermInput || !hacMemberListDisplay) return; const term = hacSearchTermInput.value.trim().toLowerCase(); if(!term) { hacMembers_mgr = []; renderHacMemberList_ManagerPage(hacMembers_mgr); if(hacMemberListDisplay) hacMemberListDisplay.innerHTML = "<p><i>Enter search term.</i></p>"; return; } hacMemberListDisplay.innerHTML = "<p><i>Searching...</i></p>";
            try {
                const q = firestore_manager.query(firestore_manager.collection(db_manager, "hacMembers"), firestore_manager.orderBy("lastName"));
                const snap = await firestore_manager.getDocs(q); let all=[]; snap.forEach(d=>all.push({id:d.id, ...d.data()}));
                hacMembers_mgr = all;
                const filtered = hacMembers_mgr.filter(m=> `${m.firstName||''} ${m.lastName||''}`.toLowerCase().includes(term) || m.phoneNumber?.includes(term) || m.driverLicense?.toLowerCase().includes(term) || m.email?.toLowerCase().includes(term));
                renderHacMemberList_ManagerPage(filtered);
            } catch(e){console.error(e); hacMemberListDisplay.innerHTML = "<p>Search Error.</p>";}
        }
        function renderHacMemberList_ManagerPage(membersToRender) {
            if(!hacMemberListDisplay) return; hacMemberListDisplay.innerHTML = ''; if(membersToRender.length === 0){ hacMemberListDisplay.innerHTML = `<p><i>No results for "${hacSearchTermInput ? hacSearchTermInput.value : ''}".</i></p>`; return; }
            membersToRender.forEach(mem => { const li = document.createElement('div'); li.className = 'employee-list-item'; const elig = mem.isEligible ? 'ELIGIBLE':'NOT ELIGIBLE'; const eligClass = mem.isEligible ? 'hac-eligible':'hac-not-eligible'; const purchaseDate = mem.membershipPurchaseDate?.toDate ? mem.membershipPurchaseDate.toDate().toLocaleDateString() : 'N/A'; const resetDate = mem.lastEligibilityReset?.toDate ? mem.lastEligibilityReset.toDate().toLocaleDateString() : ''; li.innerHTML = `<div class="employee-details"><strong>${mem.firstName} ${mem.lastName}</strong> - <strong class="${eligClass}">${elig}</strong><br>Phone: ${mem.phoneNumber||'N/A'} | DL: ${mem.driverLicense||'N/A'}<br>Email: ${mem.email||'N/A'} | Purchased: ${purchaseDate} ${resetDate ? `(Reset: ${resetDate})` : ''}</div> <div class="action-buttons-cell"><button class="edit-hac-member-btn action-button" data-id="${mem.id}">Edit</button><button class="remove-hac-member-btn action-button" data-id="${mem.id}">Remove</button></div>`; hacMemberListDisplay.appendChild(li); });
            hacMemberListDisplay.querySelectorAll('.edit-hac-member-btn').forEach(b=>b.addEventListener('click', e=>prepareEditHacMember_ManagerPage(e.target.dataset.id)));
            hacMemberListDisplay.querySelectorAll('.remove-hac-member-btn').forEach(b=>b.addEventListener('click',async e=>{if(confirm("Remove?"))await removeHacMember_ManagerPage(e.target.dataset.id);}));
        }
        async function loadTransactions_ManagerPage() {
            if (!firestore_manager.collection || !firestore_manager.query || !firestore_manager.orderBy || !firestore_manager.getDocs) { transactionsFromFirestore_mgr = []; if(transactionsDiv) transactionsDiv.innerHTML = "<p><i>Error: DB functions missing.</i></p>"; return; } try{ const q = firestore_manager.query(firestore_manager.collection(db_manager, "transactions"), firestore_manager.orderBy("createdAt", "desc")); const snap = await firestore_manager.getDocs(q); transactionsFromFirestore_mgr = []; snap.forEach(d => { const data = d.data(); let dispDate = "N/A"; if (data.createdAt && typeof data.createdAt.toDate === 'function') { dispDate = data.createdAt.toDate().toLocaleString(); } else if (data.date) { dispDate = data.date; } transactionsFromFirestore_mgr.push({id:d.id, ...data, displayDate:dispDate}); });} catch(e) { console.error("Manager: Error loading txns:", e); transactionsFromFirestore_mgr = []; if(transactionsDiv) transactionsDiv.innerHTML = `<p><i>Error loading txns: ${e.message}</i></p>`;}
        }
        function renderTransactions_ManagerPage(logToRender) {
            const targetDiv = document.getElementById('transactions'); if (!targetDiv) { return; } targetDiv.innerHTML = ''; if (!logToRender || logToRender.length === 0) { targetDiv.innerHTML = "<p><i>No transaction records found.</i></p>"; return; } const table = document.createElement('table'); table.innerHTML = `<thead><tr><th>Employee</th><th>Rank</th><th>Date</th><th>Details</th><th>SubTotal/Net ($)</th><th>Fee Rate</th><th>Fee/MikesNet ($)</th><th>Emp. Net ($)</th><th>Type</th></tr></thead><tbody></tbody>`; const tbody = table.querySelector('tbody');
            logToRender.forEach(t => { if (!t || typeof t !== 'object') { return; } const row = tbody.insertRow(); let itemsStr = 'N/A'; if (t.items && Array.isArray(t.items) && t.items.length > 0) { itemsStr = t.items.map(it => `${it.itemName || 'Item'} (x${it.quantity || 1})`).join('; '); } else if (t.itemsTraded && Array.isArray(t.itemsTraded) && t.itemsTraded.length > 0) { itemsStr = t.itemsTraded.map(it => `${it.itemName || 'Item'} (x${it.quantity || 1}) [${it.type || 'N/A'}]`).join('; '); } itemsStr = `"${itemsStr.replace(/"/g, '""')}"`; let subTotalVal = 0; if (t.transactionType === "Buy/Sell Trade") { subTotalVal = (parseFloat(t.totalValueSoldToCustomer) || 0) - (parseFloat(t.totalValueBoughtFromCustomer) || 0); } else { subTotalVal = parseFloat(t.subTotal !== undefined ? t.subTotal : t.fullSaleTotal) || 0; } let feePaidVal = 0; if (t.transactionType === "Buy/Sell Trade") { feePaidVal = parseFloat(t.netAmountForMikes) || 0; } else { feePaidVal = parseFloat(t.taxAmountPaidToMikes) || 0; } let netEmpVal = '0.00'; if (t.transactionType === "Buy/Sell Trade") { netEmpVal = 'N/A'; } else { netEmpVal = (parseFloat(t.netTotalForEmployee) || 0).toFixed(2); } const taxRateDisplay = t.taxRateApplied || (t.transactionType === "Buy/Sell Trade" ? 'N/A' : '0%'); const displayDate = t.displayDate || (t.createdAt && t.createdAt.toDate ? t.createdAt.toDate().toLocaleString() : 'N/A'); row.innerHTML = `<td>${t.employeeName||'N/A'}</td><td>${t.employeeRank||'N/A'}</td><td>${displayDate}</td><td>${itemsStr==='"N/A"'?'N/A':itemsStr.substring(1,itemsStr.length-1)}</td><td>${subTotalVal.toFixed(2)}</td><td>${taxRateDisplay}</td><td>${feePaidVal.toFixed(2)}</td><td>${netEmpVal}</td><td>${t.transactionType||'Unknown'}</td>`; });
            targetDiv.appendChild(table);
        }
        async function resetAllHacEligibility_ManagerPage() {
             if(!confirm("Reset ALL?")) return; if(resetHacEligibilityButton)resetHacEligibilityButton.disabled=true; if(hacResetStatus)hacResetStatus.textContent="Processing...";
            try {
                const snap = await firestore_manager.getDocs(firestore_manager.collection(db_manager, "hacMembers")); if(snap.empty){if(hacResetStatus)hacResetStatus.textContent="No members."; if(resetHacEligibilityButton) resetHacEligibilityButton.disabled=false; return;}
                const updates = snap.docs.map(d_1 => firestore_manager.updateDoc(d_1.ref, {isEligible: true, lastEligibilityReset: firestore_manager.serverTimestamp()}));
                await Promise.all(updates); if(hacResetStatus)hacResetStatus.textContent=`Reset ${updates.length}.`;
                if(hacSearchTermInput?.value.trim()) await searchHacMembers_ManagerPage(); else if(hacMemberListDisplay) hacMemberListDisplay.innerHTML = "<p><i>Eligibility reset. Search to see updated HAC member details.</i></p>";
            } catch(e){console.error(e); if(hacResetStatus)hacResetStatus.textContent="Error.";}
            finally { if(resetHacEligibilityButton)resetHacEligibilityButton.disabled=false; setTimeout(()=> {if(hacResetStatus)hacResetStatus.textContent=''}, 7000); }
        }
        async function loadTaxPaymentLogs_ManagerPage() {
            if (!taxPaymentLogsDisplay_el) return; taxPaymentLogsDisplay_el.innerHTML = "<p><i>Loading logs...</i></p>";
            try {
                const logsColRef = firestore_manager.collection(db_manager, "taxPaymentLogs");
                const q = firestore_manager.query(logsColRef, firestore_manager.orderBy("clearedAt", "desc"));
                const snapshot = await firestore_manager.getDocs(q); taxPaymentLogsData_mgr = [];
                snapshot.forEach(doc => { const data = doc.data(); taxPaymentLogsData_mgr.push({ id: doc.id, employeeName: data.employeeName, processingEmployeeName: data.processingEmployeeName, totalAmountCleared: data.totalAmountCleared, clearedAt: data.clearedAt?.toDate ? data.clearedAt.toDate().toLocaleString() : 'N/A', transactionIdsCount: data.transactionIds ? data.transactionIds.length : (data.transactionIdsCleared ? data.transactionIdsCleared.length : 0) }); });
                renderTaxPaymentLogs_ManagerPage();
            } catch (error) { console.error("Manager: Error loading tax payment logs:", error); if (taxPaymentLogsDisplay_el) taxPaymentLogsDisplay_el.innerHTML = `<p><i>Error loading logs.</i></p>`; }
        }
        function renderTaxPaymentLogs_ManagerPage() {
            if (!taxPaymentLogsDisplay_el) return; taxPaymentLogsDisplay_el.innerHTML = '';
            if (taxPaymentLogsData_mgr.length === 0) { taxPaymentLogsDisplay_el.innerHTML = "<p><i>No tax payment logs found.</i></p>"; return; }
            const table = document.createElement('table'); table.innerHTML = `<thead><tr><th>Employee (Taxes For)</th><th>Processed By</th><th>Amount Cleared ($)</th><th># Trans.</th><th>Date Cleared</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            taxPaymentLogsData_mgr.forEach(log => { const row = tbody.insertRow(); row.insertCell().textContent = log.employeeName || 'N/A'; row.insertCell().textContent = log.processingEmployeeName || 'N/A'; row.insertCell().textContent = (log.totalAmountCleared !== undefined ? parseFloat(log.totalAmountCleared).toFixed(2) : '0.00'); row.insertCell().textContent = log.transactionIdsCount || 0; row.insertCell().textContent = log.clearedAt; });
            taxPaymentLogsDisplay_el.appendChild(table);
        }

        function attachManagerEventListeners_ManagerPage() {
            if (saveEmployeeButton) saveEmployeeButton.addEventListener('click', saveOrUpdateEmployee_ManagerPage);
            if (cancelEditButton) cancelEditButton.addEventListener('click', resetEmployeeForm_ManagerPage);
            if (savePosItemButton_el) savePosItemButton_el.addEventListener('click', saveOrUpdatePosItem_ManagerPage);
            if (cancelEditPosItemButton_el) cancelEditPosItemButton_el.addEventListener('click', resetPosItemForm_ManagerPage);
            if (saveHacMemberButton_ManagerPage) saveHacMemberButton_ManagerPage.addEventListener('click', saveOrUpdateHacMember_ManagerPage);
            if(cancelEditHacMemberButton_ManagerPage) cancelEditHacMemberButton_ManagerPage.addEventListener('click', resetHacMemberForm_ManagerPage);
            if (hacSearchButton) hacSearchButton.addEventListener('click', searchHacMembers_ManagerPage);
            if (hacSearchTermInput) hacSearchTermInput.addEventListener('keypress', e => { if (e.key === "Enter") { e.preventDefault(); searchHacMembers_ManagerPage(); }});
            if (hacClearSearchButton) { hacClearSearchButton.addEventListener('click', () => { if(hacSearchTermInput) hacSearchTermInput.value = ''; searchHacMembers_ManagerPage(); resetHacMemberForm_ManagerPage();});}
            if (saveHacPromoButton) saveHacPromoButton.addEventListener('click', saveHacPromo_ManagerPage);
            // saveEmployeePasswordButton removed - individual passwords handled per-employee
            if (resetHacEligibilityButton) resetHacEligibilityButton.addEventListener('click', resetAllHacEligibility_ManagerPage);
            if (exportButton) {
                exportButton.addEventListener('click', async () => {
                    if (transactionsFromFirestore_mgr.length === 0) { await loadTransactions_ManagerPage(); }
                    if (transactionsFromFirestore_mgr.length === 0) { alert("No transactions to export."); return; }
                    
                    const csvHeader = ["Employee", "Rank", "Date", "Items", "SubTotal ($)", "Fee Rate (%)", "Fee Paid ($)", "Net Earned ($)", "Type"];
                    const csvRows = [csvHeader.join(",")];
                    
                    transactionsFromFirestore_mgr.forEach(t => {
                        if (!t || typeof t !== 'object') return;
                        const emp = `"${(t.employeeName || 'N/A').replace(/"/g, '""')}"`;
                        const rankVal = `"${(t.employeeRank || 'N/A').replace(/"/g, '""')}"`;
                        const dt = `"${(t.displayDate || (t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : 'N/A')).replace(/"/g, '""')}"`;
                        let itemsStr = 'N/A';
                        if (t.items && Array.isArray(t.items)) { itemsStr = t.items.map(it => `${it.itemName || 'Item'} (x${it.quantity || 1})`).join('; ');
                        } else if (t.itemsTraded && Array.isArray(t.itemsTraded)) { itemsStr = t.itemsTraded.map(it => `${it.itemName || 'Item'} (x${it.quantity || 1}) [${it.type || 'N/A'}]`).join('; '); }
                        itemsStr = `"${itemsStr.replace(/"/g, '""')}"`;
                        let sTotalVal = 0;
                        if (t.transactionType === "Buy/Sell Trade") { sTotalVal = (parseFloat(t.totalValueSoldToCustomer) || 0) - (parseFloat(t.totalValueBoughtFromCustomer) || 0);
                        } else { sTotalVal = parseFloat(t.subTotal !== undefined ? t.subTotal : t.fullSaleTotal) || 0; }
                        const sTotal = sTotalVal.toFixed(2);
                        const rateNum = (t.taxRateApplied || (t.transactionType === "Buy/Sell Trade" ? 'N/A' : '0%')).replace('%', '');
                        let feePaidVal = 0;
                        if (t.transactionType === "Buy/Sell Trade") { feePaidVal = parseFloat(t.netAmountForMikes) || 0;
                        } else { feePaidVal = parseFloat(t.taxAmountPaidToMikes) || 0; }
                        const feePaid = feePaidVal.toFixed(2);
                        let netEmpVal = '0.00';
                        if (t.transactionType === "Buy/Sell Trade") { netEmpVal = 'N/A';
                        } else { netEmpVal = (parseFloat(t.netTotalForEmployee) || 0).toFixed(2); }
                        const transType = `"${(t.transactionType || "Unknown").replace(/"/g, '""')}"`;
                        csvRows.push([emp, rankVal, dt, itemsStr, sTotal, rateNum, feePaid, netEmpVal, transType].join(","));
                    });
                    if (csvRows.length <= 1) { alert("No valid data to export."); return; }
                    const csvContent = csvRows.join("\n");
                    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none'; a.href = url; a.download = 'Mikes_Transactions.csv';
                    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
                });
            }
            if (exportTaxLogsButton_el) {
                exportTaxLogsButton_el.addEventListener('click', () => {
                    if (taxPaymentLogsData_mgr.length === 0) { alert("No tax payment logs to export."); return; }
                    const csvHeader = ["Employee (Taxes For)", "Processed By", "Amount Cleared ($)", "# Transactions", "Date Cleared"];
                    const csvRows = [csvHeader.join(",")];
                    taxPaymentLogsData_mgr.forEach(log => {
                        const row = [ `"${(log.employeeName || 'N/A').replace(/"/g, '""')}"`, `"${(log.processingEmployeeName || 'N/A').replace(/"/g, '""')}"`, (parseFloat(log.totalAmountCleared) || 0).toFixed(2), log.transactionIdsCount || 0, `"${(log.clearedAt || 'N/A').replace(/"/g, '""')}"` ];
                        csvRows.push(row.join(","));
                    });
                    if (csvRows.length <= 1) { alert("No valid tax log data to export."); return;}
                    const csvContent = csvRows.join("\n");
                    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob); const a = document.createElement('a');
                    a.href = url; a.download = 'Mikes_TaxPayment_Logs.csv'; a.style.display = 'none';
                    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
                });
            }
        }

        async function initializeManagerPortal() {
            await Promise.all([
                loadEmployees_ManagerPage(),
                loadTransactions_ManagerPage(),
                loadHacPromo_ManagerPage(),
                loadTaxPaymentLogs_ManagerPage(),
                loadPosItems_ManagerPage()
            ]);
            resetEmployeeForm_ManagerPage();
            resetPosItemForm_ManagerPage();
            renderTransactions_ManagerPage(transactionsFromFirestore_mgr);
            resetHacMemberForm_ManagerPage();
            if (hacMemberListDisplay) hacMemberListDisplay.innerHTML = "<p><i>Search for HAC members.</i></p>";
            attachManagerEventListeners_ManagerPage();
        }

        // --- Manager login: populate dropdown, show password on selection ---
        let managerLoginEmployeeList = [];

        async function loadManagerLoginEmployeeList() {
            try {
                const q = firestore_manager.query(firestore_manager.collection(db_manager, "employees"), firestore_manager.orderBy("fullName"));
                const snap = await firestore_manager.getDocs(q);
                managerLoginEmployeeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                console.error("Could not load employee list for manager login:", e);
                managerLoginEmployeeList = [];
            }
            const sel = document.getElementById('manager-login-select');
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Select Your Name --</option>';

            // Only show employees marked as managers
            const managerEmployees = managerLoginEmployeeList.filter(e => e.isManager === true);
            // Fallback: if no one has isManager set yet (fresh setup), show all so admin isn't locked out
            const listToShow = managerEmployees.length > 0 ? managerEmployees : managerLoginEmployeeList;

            listToShow.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = emp.fullName;
                sel.appendChild(opt);
            });
        }

        const managerLoginSelect_el = document.getElementById('manager-login-select');
        const managerPasswordGroup_el = document.getElementById('manager-password-group');
        const managerLoginSubmitBtn_el = document.getElementById('manager-login-submit-btn');

        if (managerLoginSelect_el) {
            managerLoginSelect_el.addEventListener('change', () => {
                const selected = managerLoginSelect_el.value;
                if (selected) {
                    if (managerPasswordGroup_el) managerPasswordGroup_el.style.display = 'block';
                    if (managerLoginSubmitBtn_el) managerLoginSubmitBtn_el.style.display = 'inline-block';
                    if (managerPasswordInput_el) { managerPasswordInput_el.value = ''; managerPasswordInput_el.focus(); }
                    if (managerLoginError_el) managerLoginError_el.style.display = 'none';
                } else {
                    if (managerPasswordGroup_el) managerPasswordGroup_el.style.display = 'none';
                    if (managerLoginSubmitBtn_el) managerLoginSubmitBtn_el.style.display = 'none';
                }
            });
        }

        if (managerLoginForm_el) {
            managerLoginForm_el.addEventListener('submit', async (event) => {
                event.preventDefault();
                const selectedId = managerLoginSelect_el ? managerLoginSelect_el.value : '';
                const enteredPass = managerPasswordInput_el ? managerPasswordInput_el.value : '';
                if (!selectedId) return;
                const emp = managerLoginEmployeeList.find(e => e.id === selectedId);
                const isBootstrapLogin = (enteredPass === MANAGER_LOGIN_PASSWORD_HARDCODED);
                const isEmployeeManagerLogin = emp && emp.isManager === true && emp.loginPassword && emp.loginPassword === enteredPass;

                if (isBootstrapLogin || isEmployeeManagerLogin) {
                    if (typeof grantManagerSession === "function") { grantManagerSession(); }
                    else { console.error("Manager ERROR: grantManagerSession is not defined!"); }
                    // If bootstrap password used, still store their name from the dropdown
                    if (emp) localStorage.setItem('loggedInEmployeeName', emp.fullName);
                    updateManagerView(true);
                    await initializeManagerPortal();
                } else {
                    if (managerLoginError_el) { managerLoginError_el.textContent = "Incorrect password or not authorised as manager."; managerLoginError_el.style.display = 'block'; }
                    if (managerPasswordInput_el) managerPasswordInput_el.value = "";
                }
            });
        }

        if (typeof checkManagerSession === "function" && checkManagerSession()) {
            updateManagerView(true);
            await initializeManagerPortal();
        } else {
            updateManagerView(false);
            await loadManagerLoginEmployeeList();
        }

        hideLoadingScreen();

        // --- SELF-CONTAINED TIER 2 MANAGER FUNCTION ---
async function initializeTier2Manager() {
    const t2SearchBtn = document.getElementById('t2-search-button');
    const t2SearchInput = document.getElementById('t2-search-term');
    const t2Display = document.getElementById('t2-member-list-display');
    const t2PurgeBtn = document.getElementById('t2-purge-button');
    const t2BackupBtn = document.getElementById('t2-backup-button');
    const t2Status = document.getElementById('t2-status-msg');

    // 1. Search Logic (Tier 2 Only)
    t2SearchBtn.onclick = async () => {
        const term = t2SearchInput.value.toLowerCase().trim();
        if (!term) return;
        t2Display.innerHTML = "Searching...";
        
        try {
            // Specifically looking for tier == 2
            const q = firestore_manager.query(firestore_manager.collection(db_manager, "hacMembers"), firestore_manager.where("tier", "==", 2));
            const snap = await firestore_manager.getDocs(q);
            t2Display.innerHTML = '';
            
            let foundCount = 0;
            snap.forEach(doc => {
                const m = doc.data();
                if (`${m.firstName} ${m.lastName}`.toLowerCase().includes(term)) {
                    foundCount++;
                    const div = document.createElement('div');
                    div.className = 'employee-list-item';
                    div.innerHTML = `
                        <span><strong>${m.firstName} ${m.lastName}</strong> - T2</span>
                        <button class="action-button clear-cart-btn" onclick="deleteIndividualT2('${doc.id}')">Delete</button>
                    `;
                    t2Display.appendChild(div);
                }
            });
            if(foundCount === 0) t2Display.innerHTML = "<p>No Tier 2 members found with that name.</p>";
        } catch (e) { console.error(e); }
    };

    // 2. Individual Delete Helper
    window.deleteIndividualT2 = async (id) => {
        if (confirm("Permanently delete this specific Tier 2 member?")) {
            await firestore_manager.deleteDoc(firestore_manager.doc(db_manager, "hacMembers", id));
            t2SearchBtn.click(); // Refresh list
        }
    };

    // 3. Purge All Tier 2 Logic
    t2PurgeBtn.onclick = async () => {
        if (!confirm("Are you sure? This will delete EVERY Tier 2 member in the database. Tier 1 (Lifetime) will not be touched.")) return;
        t2Status.textContent = "Purging database...";
        
        try {
            const q = firestore_manager.query(firestore_manager.collection(db_manager, "hacMembers"), firestore_manager.where("tier", "==", 2));
            const snap = await firestore_manager.getDocs(q);
            const promises = snap.docs.map(d => firestore_manager.deleteDoc(d.ref));
            await Promise.all(promises);
            
            t2Status.style.color = "limegreen";
            t2Status.textContent = `Success! Removed ${promises.length} Tier 2 entries.`;
            t2Display.innerHTML = '';
        } catch (e) {
            t2Status.style.color = "red";
            t2Status.textContent = "Error: " + e.message;
        }
    };

    // 4. Backup Logic (Full collection backup for safety)
    t2BackupBtn.onclick = async () => {
        t2Status.textContent = "Generating CSV...";
        try {
            const snap = await firestore_manager.getDocs(firestore_manager.collection(db_manager, "hacMembers"));
            let rows = [["First Name", "Last Name", "Tier", "Phone", "DL", "Eligible"]];
            snap.forEach(d => {
                const m = d.data();
                rows.push([m.firstName, m.lastName, m.tier || 1, m.phoneNumber || "N/A", m.driverLicense || "N/A", m.isEligible]);
            });
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "HAC_Full_Backup.csv";
            link.click();
            t2Status.textContent = "Backup Complete.";
        } catch (e) { alert("Backup failed."); }
    };
}

// 5. CALL THE FUNCTION
initializeTier2Manager();

// --- SELF-CONTAINED PRIZE WHEEL FUNCTION ---
async function initializeHacPrizeWheel() {
    const canvas = document.getElementById('hac-wheel-canvas');
    const loadBtn = document.getElementById('hac-wheel-load-btn');
    const spinBtn = document.getElementById('hac-wheel-spin-btn');
    const winnerText = document.getElementById('hac-wheel-winner-display');

    if (!canvas) return;

    let wheelEntries = [];
    let startAngle = 0;
    let arc = 0;
    let spinTimeout = null;
    let spinAngleStart = 10;
    let spinTime = 0;
    let spinTimeTotal = 0;
    let ctx = canvas.getContext("2d");

    // 1. Load Data with Tier Logic
    loadBtn.onclick = async () => {
        winnerText.textContent = "Importing members...";
        try {
            const snap = await firestore_manager.getDocs(firestore_manager.collection(db_manager, "hacMembers"));
            wheelEntries = [];

            snap.forEach(doc => {
                const m = doc.data();
                const name = `${m.firstName} ${m.lastName}`;
                
                // Tier 2 gets 2 entries, Tier 1 gets 1 entry
                const tickets = parseInt(m.tier) === 2 ? 2 : 1;
                
                for (let i = 0; i < tickets; i++) {
                    wheelEntries.push(name);
                }
            });

            if (wheelEntries.length === 0) {
                winnerText.textContent = "No members found.";
                return;
            }

            // Shuffle so T2 entries aren't always side-by-side
            wheelEntries.sort(() => Math.random() - 0.5);

            arc = Math.PI / (wheelEntries.length / 2);
            drawWheel();
            spinBtn.disabled = false;
            winnerText.textContent = `Ready! (${wheelEntries.length} tickets)`;

        } catch (e) { console.error(e); winnerText.textContent = "Load Error."; }
    };

    // 2. Draw Wheel Graphics
    function drawWheel() {
        ctx.clearRect(0, 0, 500, 500);
        const outsideRadius = 240;
        const textRadius = 160;
        const insideRadius = 50;

        for (let i = 0; i < wheelEntries.length; i++) {
            const angle = startAngle + i * arc;
            ctx.fillStyle = `hsl(${Math.floor((360 / wheelEntries.length) * i)}, 70%, 50%)`;

            ctx.beginPath();
            ctx.arc(250, 250, outsideRadius, angle, angle + arc, false);
            ctx.arc(250, 250, insideRadius, angle + arc, angle, true);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.1)";
            ctx.stroke();

            ctx.save();
            ctx.fillStyle = "white";
            ctx.translate(250 + Math.cos(angle + arc / 2) * textRadius, 250 + Math.sin(angle + arc / 2) * textRadius);
            ctx.rotate(angle + arc / 2 + Math.PI / 2);
            const text = wheelEntries[i];
            ctx.font = 'bold 10px Arial';
            ctx.fillText(text.substring(0, 15), -ctx.measureText(text.substring(0, 15)).width / 2, 0);
            ctx.restore();
        }

        // Draw Arrow
        ctx.fillStyle = "#f6e05e";
        ctx.beginPath();
        ctx.moveTo(250 - 4, 250 - (outsideRadius + 10));
        ctx.lineTo(250 + 4, 250 - (outsideRadius + 10));
        ctx.lineTo(250 + 4, 250 - (outsideRadius - 10));
        ctx.lineTo(250 + 9, 250 - (outsideRadius - 10));
        ctx.lineTo(250 + 0, 250 - (outsideRadius - 25));
        ctx.lineTo(250 - 9, 250 - (outsideRadius - 10));
        ctx.lineTo(250 - 4, 250 - (outsideRadius - 10));
        ctx.fill();
    }

    // 3. Spin Logic
    spinBtn.onclick = () => {
        spinAngleStart = Math.random() * 10 + 10;
        spinTime = 0;
        spinTimeTotal = Math.random() * 3 + 4 * 1000;
        spinBtn.disabled = true;
        winnerText.textContent = "Spinning...";
        rotateWheel();
    };

    function rotateWheel() {
        spinTime += 30;
        if (spinTime >= spinTimeTotal) {
            const degrees = startAngle * 180 / Math.PI + 90;
            const arcd = arc * 180 / Math.PI;
            const index = Math.floor((wheelEntries.length - (degrees % 360) / arcd) % wheelEntries.length);
            winnerText.textContent = "WINNER: " + wheelEntries[index];
            spinBtn.disabled = false;
            return;
        }
        const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
        startAngle += (spinAngle * Math.PI / 180);
        drawWheel();
        setTimeout(rotateWheel, 30);
    }

    function easeOut(t, b, c, d) {
        const ts = (t /= d) * t;
        const tc = ts * t;
        return b + c * (tc + -3 * ts + 3 * t);
    }
}

// 4. CALL THE FUNCTION
initializeHacPrizeWheel();

    }

    let firebaseReadyProcessed_Manager = false;
    document.addEventListener('firebaseReady', (e) => {
        if (!appLogicHasRun_Manager && !firebaseReadyProcessed_Manager) {
            firebaseReadyProcessed_Manager = true;
            executeManagerAppLogic(e.detail);
        }
    });
    document.addEventListener('firebaseError', (e) => {
        if (!appLogicHasRun_Manager && !firebaseReadyProcessed_Manager) {
            firebaseReadyProcessed_Manager = true;
            setupErrorUI_Manager("Firebase SDK init failed. " + (e.detail?.error?.message || ""));
        }
    });
    setTimeout(() => {
        if (!appLogicHasRun_Manager && !firebaseReadyProcessed_Manager) {
            if (window.isFirebaseReady && window.db && window.firestoreFunctions) {
                executeManagerAppLogic({ db: window.db, functions: window.firestoreFunctions });
            } else { setupErrorUI_Manager("App init timeout or Firebase not ready (manager)."); }
        }
    }, 3500);

    // === Reimbursement Calculator Logic ===
    const checkFirebaseInterval_reimbursement = setInterval(() => {
        if (window.db && window.firestoreFunctions) {
            clearInterval(checkFirebaseInterval_reimbursement);
            initializeReimbursementCalculator(window.db, window.firestoreFunctions);
        }
    }, 100);

    function initializeReimbursementCalculator(db, firestore) {
        console.log("Reimbursement Calculator: Initializing...");

        const REIMBURSEMENT_ITEMS = {
            'Boar Meat': { price: 175, image: 'meat.webp' }, 'Boar Hide': { price: 225, image: 'hide.webp' },
            'Deer Meat': { price: 75, image: 'meat.webp' }, 'Deer Hide': { price: 125, image: 'hide.webp' },
            'Rabbit Meat': { price: 375, image: 'meat.webp' }, 'Rabbit Hide': { price: 325, image: 'hide.webp' },
            'Rat Meat': { price: 475, image: 'meat.webp' }, 'Rat Hide': { price: 525, image: 'hide.webp' },
            'Animal Bones': { price: 225, image: 'animal_bones.webp' }, 'Crab': { price: 87, image: 'fs-crab.webp' },
            'Minnow': { price: 175, image: 'fs-minnow.webp' }, 'Haddock': { price: 175, image: 'fs-haddock.webp' },
            'Pollock': { price: 175, image: 'fs-pollock.webp' }, 'Crappie': { price: 175, image: 'fs-crappie.webp' },
            'Trout': { price: 175, image: 'fs-trout.webp' }, 'Rainbow Trout': { price: 175, image: 'fs-rainbowtrout.webp' },
            'Garfish': { price: 185, image: 'fs-garfish.webp' }, 'Striped Bass': { price: 200, image: 'fs-stripedbass.webp' },
            'Salmon': { price: 200, image: 'fs_salmon.webp' }, 'Northern Pike': { price: 225, image: 'fs-northernpike.webp' },
            'Tuna': { price: 250, image: 'fs-tuna.webp' }, 'Salmon Meat': { price: 10, image: 'fishmeat_salmon.webp' },
            'Slimy Fish Meat': { price: 2, image: 'fishmeat_slimy.webp' }, 'White Fish Meat': { price: 10, image: 'fishmeat_white.webp' }
        };

        const reimbursementItemsContainer = document.getElementById('reimbursement-items-container');
        const employeeSelect = document.getElementById('reimbursement-employee-select');
        const profileBox = document.getElementById('employee-profile');
        const profileName = document.getElementById('employee-profile-name');
        const profileBank = document.getElementById('employee-profile-bank');
        const clearBtn = document.getElementById('clear-reimbursement-button');
        const logBtn = document.getElementById('log-reimbursement-button');
        const totalDisplay = document.getElementById('reimbursement-total');
        const logStatus = document.getElementById('reimbursement-status-message');
        const logDisplay = document.getElementById('reimbursement-log-display');
        const exportLogBtn = document.getElementById('export-reimbursement-log-button');
        const toggleBtn = document.getElementById('toggle-reimbursement-btn');
        const contentWrapper = document.getElementById('reimbursement-content-wrapper');
        const pettyCashAmountInput = document.getElementById('petty-cash-amount');
        const pettyCashNoteInput = document.getElementById('petty-cash-note');

        if (!reimbursementItemsContainer) return;

        function calculateAndDisplayTotal() {
            let itemTotal = 0;
            document.querySelectorAll('#reimbursement-items-container .quantity').forEach(input => {
                const itemDiv = input.closest('.item');
                const price = parseFloat(itemDiv?.dataset.price || 0);
                const qty = parseInt(input.value || 0);
                if (qty > 0 && price > 0) {
                    itemTotal += qty * price;
                }
            });

            const pettyCashTotal = parseFloat(pettyCashAmountInput.value) || 0;
            const grandTotal = itemTotal + pettyCashTotal;

            totalDisplay.textContent = grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (logBtn) logBtn.style.display = (grandTotal > 0) ? 'inline-block' : 'none';
        }
        
        function renderReimbursementItems() {
            reimbursementItemsContainer.innerHTML = '';
            const itemsToRender = Object.entries(REIMBURSEMENT_ITEMS);
            for (const [name, data] of itemsToRender) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item';
                itemDiv.dataset.name = name;
                itemDiv.dataset.price = data.price;
                const img = document.createElement('img');
                img.src = data.image; 
                img.alt = name;
                img.onerror = () => { img.src = 'placeholder.png'; };
                const p = document.createElement('p');
                p.textContent = name;
                const label = document.createElement('label');
                label.textContent = `$${data.price}`;
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.value = '0';
                input.className = 'quantity';
                input.addEventListener('input', calculateAndDisplayTotal);
                itemDiv.appendChild(img);
                itemDiv.appendChild(p);
                itemDiv.appendChild(label);
                itemDiv.appendChild(input);
                itemDiv.addEventListener('click', e => {
                    if (e.target !== input) {
                        input.value = parseInt(input.value || 0) + 1;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
                reimbursementItemsContainer.appendChild(itemDiv);
            }
        }

        async function loadEmployeesForReimbursement() {
            try {
                const q = firestore.query(firestore.collection(db, 'employees'), firestore.orderBy('fullName'));
                const snap = await firestore.getDocs(q);
                employeeSelect.innerHTML = '<option value="">-- Select Employee --</option>';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.textContent = data.fullName;
                    opt.dataset.bank = data.bankAccountNumber || 'N/A';
                    employeeSelect.appendChild(opt);
                });
            } catch (err) { console.error('Error loading employees:', err); }
        }

        async function renderReimbursementLog() {
            if (!logDisplay) return;
            logDisplay.innerHTML = '<p><i>Loading logs...</i></p>';
            try {
                const q = firestore.query(firestore.collection(db, 'reimbursements'), firestore.orderBy('createdAt', 'desc'));
                const snap = await firestore.getDocs(q);
                if (snap.empty) {
                    logDisplay.innerHTML = '<p><i>No reimbursement logs found.</i></p>';
                    return;
                }
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>Employee</th><th>Bank Acct</th><th>Total ($)</th><th>Items / Reason</th><th>Date</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                snap.forEach(doc => {
                    const d = doc.data();
                    const itemsString = (d.items || []).map(i => `${i.item}(x${i.qty})`).join('; ');
                    const dateString = d.createdAt?.toDate?.().toLocaleString() || 'N/A';
                    const row = tbody.insertRow();
                    row.innerHTML = `<td>${d.employeeName||'N/A'}</td><td>${d.bankAccount||'N/A'}</td><td>${(d.totalAmount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td style="white-space:normal;">${itemsString}</td><td>${dateString}</td>`;
                });
                logDisplay.innerHTML = '';
                logDisplay.appendChild(table);
            } catch (err) {
                console.error('Error rendering log:', err);
                logDisplay.innerHTML = '<p><i>Error loading logs. Please check console (F12).</i></p>';
            }
        }
        
        function clearReimbursementCart() {
            document.querySelectorAll('#reimbursement-items-container .quantity').forEach(input => {
                input.value = '0';
            });
            if (pettyCashAmountInput) pettyCashAmountInput.value = '';
            if (pettyCashNoteInput) pettyCashNoteInput.value = '';
            if (logStatus) logStatus.textContent = '';
            calculateAndDisplayTotal();
            console.log("Reimbursement selections cleared.");
        }

        if (toggleBtn && contentWrapper) {
            const headerElement = toggleBtn.parentElement;
            headerElement.addEventListener('click', (e) => {
                if(e.target === headerElement || e.target === headerElement.querySelector('h2')) {
                    contentWrapper.classList.toggle('open');
                    const isOpen = contentWrapper.classList.contains('open');
                    toggleBtn.textContent = isOpen ? 'Hide' : 'Show';
                }
            });
             toggleBtn.addEventListener('click', () => {
                contentWrapper.classList.toggle('open');
                const isOpen = contentWrapper.classList.contains('open');
                toggleBtn.textContent = isOpen ? 'Hide' : 'Show';
            });
        }

        if (employeeSelect) {
            employeeSelect.addEventListener('change', () => {
                const selected = employeeSelect.selectedOptions[0];
                if (selected?.value) {
                    profileBox.style.display = 'block';
                    profileName.textContent = selected.textContent;
                    profileBank.textContent = selected.dataset.bank || 'N/A';
                } else {
                    profileBox.style.display = 'none';
                }
                if (logStatus) logStatus.textContent = '';
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', clearReimbursementCart);
        }
        
        if (pettyCashAmountInput) {
            pettyCashAmountInput.addEventListener('input', calculateAndDisplayTotal);
        }

        if (logBtn) {
            logBtn.addEventListener('click', async () => {
                const empId = employeeSelect.value;
                if (!empId) {
                    logStatus.textContent = 'Please select an employee.'; return;
                }
                const selectedOption = employeeSelect.selectedOptions[0];
                const employeeName = selectedOption.textContent;
                const bank = selectedOption.dataset.bank;
                const total = parseFloat(totalDisplay.textContent.replace(/,/g, ''));

                if (isNaN(total) || total <= 0) {
                    logStatus.textContent = 'No amount to log.'; return;
                }
                
                const items = [];
                document.querySelectorAll('#reimbursement-items-container .quantity').forEach(input => {
                    const item = input.closest('.item')?.dataset.name;
                    const qty = parseInt(input.value || 0);
                    if (item && qty > 0) {
                        items.push({ item, qty });
                    }
                });

                const pettyCashAmount = parseFloat(pettyCashAmountInput.value) || 0;
                const pettyCashNote = pettyCashNoteInput.value.trim();

                if (pettyCashAmount > 0 && !pettyCashNote) {
                    logStatus.textContent = 'A reason/note is required for petty cash.';
                    return;
                }
                
                if (pettyCashAmount > 0) {
                    items.push({ item: `Petty Cash: ${pettyCashNote}`, qty: 1 });
                }
                
                logBtn.disabled = true; logStatus.textContent = 'Logging...';
                try {
                    await firestore.addDoc(firestore.collection(db, 'reimbursements'), {
                        employeeId: empId, employeeName: employeeName, bankAccount: bank, 
                        items, totalAmount: total, createdAt: firestore.serverTimestamp()
                    });
                    logStatus.textContent = 'Reimbursement logged successfully.';
                    clearReimbursementCart();
                    await renderReimbursementLog();
                } catch (err) {
                    logStatus.textContent = 'Error: Could not log reimbursement.';
                    console.error("Logging Error:", err);
                } finally {
                    logBtn.disabled = false;
                }
            });
        }
        
        if (exportLogBtn) {
            exportLogBtn.addEventListener('click', async () => {
                try {
                    const q = firestore.query(firestore.collection(db, 'reimbursements'), firestore.orderBy('createdAt', 'desc'));
                    const snap = await firestore.getDocs(q);
                    if (snap.empty) { alert('No logs to export.'); return; }
                    const rows = [["Employee", "Bank Account", "Total ($)", "Items / Reason", "Date"]];
                    snap.forEach(doc => {
                        const d = doc.data();
                        const items = (d.items || []).map(i => `${i.item}(x${i.qty})`).join('; ');
                        rows.push([ `"${d.employeeName}"`, `"${d.bankAccount}"`, d.totalAmount, `"${items}"`, `"${d.createdAt?.toDate?.().toLocaleString()}"` ]);
                    });
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'mikes_reimbursement_log.csv';
                    a.click(); URL.revokeObjectURL(url);
                } catch (err) { alert("An error occurred during export."); }
            });
        }

        renderReimbursementItems();
        loadEmployeesForReimbursement();
        renderReimbursementLog();
        calculateAndDisplayTotal();
    }

});
