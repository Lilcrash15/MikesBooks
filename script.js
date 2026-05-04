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
            }, 500);
        }
    }
    
    console.log("script.js (Index Main): DOMContentLoaded. Waiting for Firebase...");
    let appLogicHasRun = false;

    function setupErrorUI(errorMessage) {
        if (appLogicHasRun && !errorMessage.includes("Manually initializing")) return;
        appLogicHasRun = true;
        console.error("script.js (Index Main): Firebase critical error:", errorMessage);
        alert("Critical error on Home page: " + errorMessage + " Some functionality will be disabled.");
        const loginForm = document.getElementById('main-employee-login-form');
        if (loginForm) {
            const loginButton = loginForm.querySelector('button[type="submit"]');
            if (loginButton) { loginButton.disabled = true; loginButton.textContent = "Login Disabled (DB Error)";}
        }
        const appContent = document.getElementById('application-main-content');
        if (appContent) appContent.style.display = 'none';
        hideLoadingScreen();
    }

    async function executeMainAppLogic(firebaseDetail) {
        if (appLogicHasRun) { return; }
        appLogicHasRun = true;
        console.log("script.js (Index Main): Running executeMainAppLogic.");

        if (!firebaseDetail || !firebaseDetail.db || !firebaseDetail.functions) {
            setupErrorUI("Firebase details not properly passed to main app logic."); return;
        }
        const db = firebaseDetail.db;
        const firestore = firebaseDetail.functions;

        const employeeLoginContainer = document.getElementById('employee-login-container');
        const employeeLoginForm = document.getElementById('main-employee-login-form');
        const employeePasswordInput = document.getElementById('main-employee-password');
        const mainLoginError = document.getElementById('main-login-error');
        const applicationMainContent = document.getElementById('application-main-content');
        const viewSwitcher = document.getElementById('view-switcher');
        const showPosViewBtn = document.getElementById('show-pos-view-btn');
        const showBuySellViewBtn = document.getElementById('show-buysell-view-btn');
        const posViewContainer = document.getElementById('pos-view-container');
        const buySellViewContainer = document.getElementById('buysell-view-container');
        const processingEmployeeSelect = document.getElementById('processing-employee-select');
        const posItemsContainer = document.getElementById('pos-items-container');
        const categoryButtons = document.querySelectorAll('#category-buttons-container .category-button');
        const posTotalDisplay = document.getElementById('total');
        const posCheckoutButton = document.getElementById('checkout-button-pos');
        const posClearCartButton = document.getElementById('clear-cart-button-pos');
        const hacMembershipItemEl = document.getElementById('hac-membership-item');
        const hacSignupModalEl = document.getElementById('hac-signup-modal');
        const closeHacModalButtonEl = hacSignupModalEl ? hacSignupModalEl.querySelector('.close-hac-modal') : null;
        const submitHacSignupButtonEl = document.getElementById('submit-hac-signup-button');
        const hacModalFirstNameInput = document.getElementById('hac-modal-first-name');
        const hacModalLastNameInput = document.getElementById('hac-modal-last-name');
        const hacModalPhoneNumberInput = document.getElementById('hac-modal-phone-number');
        const hacModalDriverLicenseInput = document.getElementById('hac-modal-driver-license');
        const hacModalEmailInput = document.getElementById('hac-modal-email');
        const hacModalStatusEl = document.getElementById('hac-modal-status');
        const hacStaffSearchTermInputEl = document.getElementById('hac-staff-search-term');
        const hacStaffSearchButtonEl = document.getElementById('hac-staff-search-button');
        const hacStaffClearSearchButtonEl = document.getElementById('hac-staff-clear-search-button');
        const hacStaffSearchResultsDisplayEl = document.getElementById('hac-staff-search-results');
        const hacCurrentPromoDisplayStaffEl = document.getElementById('hac-current-promo-display-staff');
        const hacPromoMonthStaffDisplayEl = document.getElementById('hac-promo-month-staff');
        const hacPromoTextStaffDisplayEl = document.getElementById('hac-promo-text-staff');
        const mikesBuysItemsContainer = document.getElementById('mikes-buys-items-container');
        const mikesSellsItemsContainer = document.getElementById('mikes-sells-items-container');
        const totalOwedToCustomerDisplay = document.getElementById('total-owed-to-customer');
        const totalOwedToMikesDisplay = document.getElementById('total-owed-to-mikes');
        const summaryOwedCustomerDisplay = document.getElementById('summary-owed-customer');
        const summaryOwedMikesDisplay = document.getElementById('summary-owed-mikes');
        const netTransactionAmountDisplay = document.getElementById('net-transaction-amount');
        const netTransactionPartyDisplay = document.getElementById('net-transaction-party');
        const buySellClearButton = document.getElementById('buysell-clear-button');
        const buySellCheckoutButton = document.getElementById('buysell-checkout-button');
        const buySellStatusMessage = document.getElementById('buysell-status-message');
        const posItemSearchInput = document.getElementById('pos-item-search-input');
        const posItemSearchClearBtn = document.getElementById('pos-item-search-clear-btn');
        
        let allPosItemElements = [];
        let managedEmployees = [];
        // --- HAC TIER 2 ADDITIONS ---
        let activeHacTier = 1;
        let activeHacDuration = "Lifetime";
        let activeHacItemRef = null;
        const taxRatesByRank = { "Trainee": 0.20, "Staff": 0.15, "Senior Staff": 0.10, "Manager": 0.00 };
        const buySellItemDefinitions = {
             buy: {
                "Crab": { price: 87, image: "fs-crab.webp" }, "Minnow": { price: 175, image: "fs-minnow.webp" },
                "Haddock": { price: 175, image: "fs-haddock.webp" }, "Pollock": { price: 175, image: "fs-pollock.webp" },
                "Crappie": { price: 175, image: "fs-crappie.webp" }, "Trout": { price: 175, image: "fs-trout.webp" },
                "Rainbow Trout": { price: 175, image: "fs-rainbowtrout.webp" }, "Garfish": { price: 185, image: "fs-garfish.webp" },
                "Striped Bass": { price: 200, image: "fs-stripedbass.webp" }, "Salmon": { price: 200, image: "fs-salmon.png" },
                "Northern Pike": { price: 225, image: "fs-northernpike.webp" }, "Tuna": { price: 250, image: "fs-tuna.webp" },
                "Deer Meat": { price: 75, image: "meat.webp" }, "Boar Meat": { price: 175, image: "meat.webp" },
                "Rabbit Meat": { price: 375, image: "meat.webp" }, "Rat Meat": { price: 475, image: "meat.webp" },
                "Animal Bones": { price: 225, image: "animal_bones.webp" }, "Salmon Meat": { price: 10, image: "fishmeat_salmon.webp" },
                "Slimy Fish Meat": { price: 2, image: "fishmeat_slimy.webp" }, "White Fish Meat": { price: 10, image: "fishmeat_white.webp" },
                "Deer Hide": { price: 125, image: "hide.webp" }, "Boar Hide": { price: 225, image: "hide.webp" },
                "Rabbit Hide": { price: 325, image: "hide.webp" }, "Rat Hide": { price: 525, image: "hide.webp" },
                "Gold Nugget": { price: 32, image: "goldNugget.png" }, "Peyote": { price: 500, image: "peyote.png" },
            },
            sell: {
                "White Fish Meat": { price: 17, image: "fishmeat_white.webp" }, "Salmon Meat": { price: 20, image: "fishmeat_salmon.webp" },
                "Crab": { price: 90, image: "fs-crab.webp" }
            }
        };
        const buySellCart = { buy: {}, sell: {} };
        let currentHacPromo = { month: 'N/A', text: 'Loading...'};
        
        // Employee list loaded on page load for the login dropdown
        let loginEmployeeList = [];

        async function loadLoginEmployeeList() {
            try {
                const q = firestore.query(firestore.collection(db, "employees"), firestore.orderBy("fullName"));
                const snap = await firestore.getDocs(q);
                loginEmployeeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                console.error("Could not load employee list for login:", e);
                loginEmployeeList = [];
            }
            const sel = document.getElementById('login-employee-select');
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Select Your Name --</option>';
            loginEmployeeList.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = emp.fullName;
                sel.appendChild(opt);
            });
        }

        function updateLoginView(isLoggedIn) {
            if (isLoggedIn) {
                if (employeeLoginContainer) employeeLoginContainer.style.display = 'none';
                if (applicationMainContent) applicationMainContent.style.display = 'block';
                if (mainLoginError) mainLoginError.style.display = 'none';
                if (typeof addLogoutButton === "function") addLogoutButton();
                if (viewSwitcher) viewSwitcher.style.display = 'flex';
                if (showPosViewBtn && typeof showPosViewBtn.click === 'function') showPosViewBtn.click(); else switchToPosView();
            } else {
                if (employeeLoginContainer) employeeLoginContainer.style.display = 'block';
                if (applicationMainContent) applicationMainContent.style.display = 'none';
                if (viewSwitcher) viewSwitcher.style.display = 'none';
            }
        }

        // ===== SHIFT NOTE BANNER =====
        async function loadShiftNoteBanner() {
            const banner = document.getElementById('shift-note-banner');
            const noteText = document.getElementById('shift-note-text');
            const noteMeta = document.getElementById('shift-note-meta');
            const dismissBtn = document.getElementById('shift-note-dismiss');
            if (!banner) return;

            try {
                const snap = await firestore.getDoc(firestore.doc(db, 'siteSettings', 'shiftNote'));
                if (snap.exists() && snap.data().text && snap.data().text.trim() !== '') {
                    const d = snap.data();
                    const ts = d.postedAt ? new Date(d.postedAt.seconds * 1000).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '';
                    if (noteText) noteText.innerHTML = d.text;
                    if (noteMeta) noteMeta.textContent = `${d.postedBy || 'Manager'}${ts ? ' · ' + ts : ''}`;
                    banner.style.display = 'block';

                    if (dismissBtn) {
                        dismissBtn.addEventListener('click', () => {
                            banner.style.display = 'none';
                        });
                    }
                }
            } catch(e) {
                console.error('Error loading shift note:', e);
            }
        }

        async function loadAndPopulateEmployees() {
            try {
                const q = firestore.query(firestore.collection(db, "employees"), firestore.orderBy("fullName"));
                const snap = await firestore.getDocs(q);
                managedEmployees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error("Error loading employees:", e);
                managedEmployees = [{ fullName: "Preston Stone", rank: "Manager", employeeNumber:"40262", taxReward: { isActive: false, endDate: null }}];
            }

            if (processingEmployeeSelect) {
                processingEmployeeSelect.innerHTML = '<option value="">-- Select Employee --</option>';
                managedEmployees.forEach(emp => {
                    const opt = new Option(emp.fullName, emp.fullName);
                    opt.dataset.employeeData = JSON.stringify(emp);
                    processingEmployeeSelect.appendChild(opt);
                });

                // Auto-select and lock to the logged-in employee
                const loggedInName = localStorage.getItem('loggedInEmployeeName');
                const activeEmployeeDisplay = document.getElementById('active-employee-display');
                const activeEmployeeNameEl = document.getElementById('active-employee-name');

                if (loggedInName) {
                    for (let i = 0; i < processingEmployeeSelect.options.length; i++) {
                        if (processingEmployeeSelect.options[i].value === loggedInName) {
                            processingEmployeeSelect.selectedIndex = i;
                            processingEmployeeSelect.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                    if (activeEmployeeNameEl) activeEmployeeNameEl.textContent = loggedInName;
                    if (activeEmployeeDisplay) activeEmployeeDisplay.style.display = 'block';
                }
            }
        }
        
        function cacheAllPosItems() {
            allPosItemElements = Array.from(posItemsContainer.querySelectorAll('.item'));
        }

        function createPosItemElement(itemData) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item dynamic-item';
            itemDiv.dataset.price = itemData.price;
            itemDiv.dataset.category = itemData.category;
            const nameForId = itemData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const uniqueInputId = `quantity_${nameForId}_${itemData.id || Math.random().toString(36).substr(2, 9)}`;

            itemDiv.innerHTML = `
                <img src="${itemData.imageUrl || 'placeholder.png'}" alt="${itemData.name}">
                <p>${itemData.name} $${itemData.price}</p>
                <label for="${uniqueInputId}">Quantity:</label>
                <input type="number" id="${uniqueInputId}" min="0" value="0" class="quantity">
            `;
            return itemDiv;
        }
        
        async function loadAndRenderDynamicPosItems() {
            if (!posItemsContainer) return;
            try {
                const q = firestore.query(firestore.collection(db, "posItems"), firestore.orderBy("name"));
                const snapshot = await firestore.getDocs(q);
                
                snapshot.forEach(doc => {
                    const itemData = { id: doc.id, ...doc.data() };
                    const itemElement = createPosItemElement(itemData);
                    posItemsContainer.appendChild(itemElement);
                });

            } catch (error) {
                console.warn("Could not load dynamic POS items (this is expected for non-managers):", error.message);
            }
        }
        
        function switchToPosView() {
            if (posViewContainer) posViewContainer.style.display = 'block';
            if (buySellViewContainer) buySellViewContainer.style.display = 'none';
            if (showPosViewBtn) showPosViewBtn.classList.add('active');
            if (showBuySellViewBtn) showBuySellViewBtn.classList.remove('active');
            const allCategoryButton = document.querySelector('#category-buttons-container .category-button[data-category-filter="All"]');
            if (allCategoryButton && !allCategoryButton.classList.contains('active')) { allCategoryButton.click();
            } else if (categoryButtons.length > 0 && !document.querySelector('#category-buttons-container .category-button.active')) { categoryButtons[0].click();
            } else if (categoryButtons.length > 0 && document.querySelector('#category-buttons-container .category-button.active')) { document.querySelector('#category-buttons-container .category-button.active').click(); }
             calculateMainPOSTotal();
             if (typeof updateDisplayBox === 'function') updateDisplayBox();
        }

        function switchToBuySellView() {
            if (posViewContainer) posViewContainer.style.display = 'none';
            if (buySellViewContainer) buySellViewContainer.style.display = 'block';
            if (showPosViewBtn) showPosViewBtn.classList.remove('active');
            if (showBuySellViewBtn) showBuySellViewBtn.classList.add('active');
            if (mikesBuysItemsContainer && (!mikesBuysItemsContainer.hasChildNodes() || (mikesBuysItemsContainer.children.length === 1 && mikesBuysItemsContainer.querySelector('.loading-message')))) { renderBuySellPageItems();
            } else if (mikesSellsItemsContainer && (!mikesSellsItemsContainer.hasChildNodes() || (mikesSellsItemsContainer.children.length === 1 && mikesSellsItemsContainer.querySelector('.loading-message')))) { if (mikesBuysItemsContainer && !mikesBuysItemsContainer.querySelector('.buysell-page-item')) { renderBuySellPageItems(); }
            } else if (mikesBuysItemsContainer && !mikesBuysItemsContainer.querySelector('.buysell-page-item')) { renderBuySellPageItems(); }
            updateBuySellViewTotals();
        }

        function clearMainPOSCart() {
            allPosItemElements.forEach(item => {
                const quantityInput = item.querySelector('.quantity');
                if (quantityInput) {
                    quantityInput.value = 0;
                    quantityInput.dispatchEvent(new Event('input', {bubbles: true}));
                }
                if (item.id === 'hac-membership-item') {
                    item.removeAttribute('data-hac-member-sale');
                    item.removeAttribute('data-new-hac-member-id');
                }
            });
            filterAndDisplayPosItems(); 
            renderCurrentCartSection();
        }

        function calculateMainPOSTotal() {
            let total = 0;
            allPosItemElements.forEach(item => {
                // Always include ALL items in total regardless of search/filter visibility
                const price = parseFloat(item.getAttribute('data-price'));
                let quantity = 0;
                const quantityInput = item.querySelector('.quantity');

                if (item.id === 'hac-membership-item' && item.getAttribute('data-hac-member-sale') === 'true') {
                    quantity = 1;
                } else if (quantityInput) {
                    quantity = parseInt(quantityInput.value) || 0;
                }
                
                if (quantityInput) {
                    quantityInput.style.color = quantity > 0 ? 'limegreen' : '#a0aec0';
                }

                if (!isNaN(price) && quantity > 0) {
                    total += price * quantity;
                }
            });
            if (posTotalDisplay) {
                posTotalDisplay.textContent = total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            }
        }

        function renderCurrentCartSection() {
            let cartItems = [];
            allPosItemElements.forEach(item => {
                const quantityInput = item.querySelector('.quantity');
                const quantity = parseInt(quantityInput?.value) || 0;
                if (quantity > 0 && item.dataset.pack !== 'true') {
                    const name = item.querySelector('img')?.alt || 'Unnamed';
                    cartItems.push({ name, quantity });
                }
            });
        
            const currentCartSection = document.getElementById('current-cart-section');
            if (!currentCartSection) return;
            const cartList = currentCartSection.querySelector('.cart-list');
            if (!cartList) return;
        
            cartList.innerHTML = '';
            if (cartItems.length > 0) {
                cartItems.forEach(({ name, quantity }) => {
                    const item = document.createElement('div');
                    item.textContent = `${name} x${quantity}`;
                    item.style.cursor = 'pointer';
                    item.style.textAlign = 'center';
                    item.style.maxWidth = 'auto';
                    item.style.margin = '4px 0';
        
                    item.addEventListener('click', () => {
                        const isStruck = item.classList.toggle('struck');
                        item.style.textDecoration = isStruck ? 'line-through' : 'none';
                        item.style.opacity = isStruck ? '0.6' : '1';
                    });
        
                    cartList.appendChild(item);
                });
                currentCartSection.style.display = 'block';
            } else {
                currentCartSection.style.display = 'none';
            }
        }        

        // --- START: UPDATED CHECKOUT FUNCTION ---
        async function checkoutPOS() {
            if (!processingEmployeeSelect || !processingEmployeeSelect.value) {
                alert("Please select the processing employee."); return;
            }
            const selectedOpt = processingEmployeeSelect.options[processingEmployeeSelect.selectedIndex];
            const employeeData = JSON.parse(selectedOpt.dataset.employeeData);
            const employeeName = employeeData.fullName;
            const employeeRank = employeeData.rank;

            const currentTotal = parseFloat(posTotalDisplay.textContent.replace(/,/g, '')) || 0;
            
            let saleItemsStructured = [];
            allPosItemElements.forEach(item => {
                let quantity = 0;
                const isHacSale = item.id === 'hac-membership-item' && item.getAttribute('data-hac-member-sale') === 'true';

                if (isHacSale) {
                    quantity = 1;
                } else {
                    const quantityInput = item.querySelector('.quantity');
                    if (quantityInput) quantity = parseInt(quantityInput.value) || 0;
                }

                if (quantity > 0) {
                    const pTag = item.querySelector('p');
                    const itemName = pTag ? pTag.textContent.split('$')[0].trim() : 'Unknown Item';
                    saleItemsStructured.push({ 
                        itemName, 
                        quantity, 
                        price: parseFloat(item.getAttribute('data-price')) 
                    });
                }
            });

            if (saleItemsStructured.length === 0) {
                alert("No items in the cart.");
                return;
            }

            // --- Tax Logic ---
            let taxRate = taxRatesByRank[employeeRank] !== undefined ? taxRatesByRank[employeeRank] : 0.00;
            const taxReward = employeeData.taxReward || { isActive: false, endDate: null };
            let isRewardActive = false;

            if (taxReward.isActive) {
                if (taxReward.endDate && taxReward.endDate.seconds) {
                    const endDate = new Date(taxReward.endDate.seconds * 1000);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Set to the beginning of today for comparison
                    
                    // The reward is active if the end date is today or in the future
                    if (endDate >= today) {
                        isRewardActive = true;
                    }
                } else {
                    // If there's no end date, the reward is considered active indefinitely
                    isRewardActive = true;
                }
            }
            
            if (isRewardActive) {
                taxRate = 0.00; // Override with 0% tax
            }
            // --- End Tax Logic ---

            const taxAmount = currentTotal * taxRate;
            const netTotalAfterTax = currentTotal - taxAmount;
            
            const transactionData = {
                transactionType: "POS Sale", employeeName, employeeRank, items: saleItemsStructured,
                subTotal: parseFloat(currentTotal.toFixed(2)), taxRateApplied: `${(taxRate * 100).toFixed(0)}%`,
                taxAmountPaidToMikes: parseFloat(taxAmount.toFixed(2)), netTotalForEmployee: parseFloat(netTotalAfterTax.toFixed(2)),
                fullSaleTotal: parseFloat(currentTotal.toFixed(2)), taxesCleared: false, createdAt: firestore.serverTimestamp()
            };

            try {
                await firestore.addDoc(firestore.collection(db, "transactions"), transactionData);
                alert( `POS Transaction Completed for: ${employeeName} (${employeeRank || 'N/A'})\n` + 
                       (isRewardActive ? `*** 0% TAX REWARD APPLIED ***\n` : '') +
                       `---------------------------------------\n` + 
                       `Total Sale Amount: $${currentTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}\n` + 
                       `Fee to Mikes (${(taxRate * 100).toFixed(0)}%): $${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` + 
                       `Net Amount for Employee: $${netTotalAfterTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` );
                clearMainPOSCart();
            } catch (error) { 
                alert(`Failed to save POS transaction. ${error.message}`);
            }
        }
        // --- END: UPDATED CHECKOUT FUNCTION ---

        // Revised to handle multiple Tier 1 & Tier 2 buttons
        function openHacSignupModal(itemEl) {
            activeHacItemRef = itemEl;
            activeHacTier = parseInt(itemEl.dataset.hacTier) || 1;
            activeHacDuration = itemEl.dataset.hacDuration || "Lifetime";

            // Toggle T2 Checkbox Visibility
            const t2Container = document.getElementById('hac-tier2-confirmation-container');
            const t2Checkbox = document.getElementById('hac-modal-tier2-confirm');
            if (t2Container) t2Container.style.display = (activeHacTier === 2) ? 'flex' : 'none';
            if (t2Checkbox) t2Checkbox.checked = false;

            if (hacSignupModalEl) {
                if(hacModalFirstNameInput) hacModalFirstNameInput.value = '';
                if(hacModalLastNameInput) hacModalLastNameInput.value = '';
                if(hacModalPhoneNumberInput) hacModalPhoneNumberInput.value = '';
                if(hacModalDriverLicenseInput) hacModalDriverLicenseInput.value = '';
                if(hacModalEmailInput) hacModalEmailInput.value = '';
                if(hacModalStatusEl) { hacModalStatusEl.textContent = ''; }
                hacSignupModalEl.style.display = "flex";
            }
        }

        function closeHacSignupModal() { if (hacSignupModalEl) hacSignupModalEl.style.display = "none"; }

async function submitHacMemberSignup() {
            const firstName = hacModalFirstNameInput.value.trim();
            const lastName = hacModalLastNameInput.value.trim();
            const t2Checked = document.getElementById('hac-modal-tier2-confirm').checked;

            if (!firstName || !lastName) {
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "First and Last name required."; hacModalStatusEl.style.color = "red"; } 
                return;
            }

            // Enforce T2 Checkbox
            if (activeHacTier === 2 && !t2Checked) {
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "Please check the T2 confirmation box."; hacModalStatusEl.style.color = "red"; }
                return;
            }

            if(submitHacSignupButtonEl) {submitHacSignupButtonEl.disabled = true; submitHacSignupButtonEl.textContent = "Submitting...";}

            // Calculate Expiration Date
            let expirationDate = null;
            let monthsToAdd = 0;

            // 1. Determine how many months to add based on selection
            if (activeHacDuration === "1 Month") monthsToAdd = 1;
            else if (activeHacDuration === "3 Months") monthsToAdd = 3;
            else if (activeHacDuration === "6 Months") monthsToAdd = 6;
            else if (activeHacDuration === "1 Year") monthsToAdd = 12;

            // 2. If it's a timed membership, calculate the 1st of that future month
            if (monthsToAdd > 0) {
                let exp = new Date();
                // Move to the target month
                exp.setMonth(exp.getMonth() + monthsToAdd);
                // Snap to the 1st day of that month
                exp.setDate(1);
                // Set to midnight for clean comparisons
                exp.setHours(0, 0, 0, 0);
                expirationDate = exp;
            }

            const newMemberData = {
                firstName, lastName,
                phoneNumber: hacModalPhoneNumberInput.value.trim() || null,
                driverLicense: hacModalDriverLicenseInput.value.trim() || null,
                email: hacModalEmailInput.value.trim().toLowerCase() || null,
                isEligible: true,
                tier: activeHacTier,
                membershipDuration: activeHacDuration,
                expirationDate: expirationDate,
                membershipPurchaseDate: firestore.serverTimestamp(),
                lastStatusChange: firestore.serverTimestamp(),
                createdAt: firestore.serverTimestamp()
            };

            try {
                await firestore.addDoc(firestore.collection(db, "hacMembers"), newMemberData);
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "Signup successful!"; hacModalStatusEl.style.color = "green"; }
                
                // Mark item in POS as sold to include in checkout total
                if(activeHacItemRef) {
                    activeHacItemRef.setAttribute('data-hac-member-sale', 'true');
                }
                
                calculateMainPOSTotal();
                renderCurrentCartSection();
                
                setTimeout(() => { 
                    closeHacSignupModal(); 
                    if(submitHacSignupButtonEl){ submitHacSignupButtonEl.disabled = false; submitHacSignupButtonEl.textContent = "Submit & Add to Cart";} 
                }, 1500);
            } catch (error) {
                if(hacModalStatusEl) { hacModalStatusEl.textContent = "Error: "+error.message; hacModalStatusEl.style.color = "red"; }
                if(submitHacSignupButtonEl){ submitHacSignupButtonEl.disabled = false; submitHacSignupButtonEl.textContent = "Submit & Add to Cart";}
            }
        }
        // Converts "1 Armor 1 Jerry Can 100 Bandages" into a bullet list HTML string.
        // Splits on patterns like a number followed by a word/phrase before the next number.
        const FIXED_HAC_ITEMS_STAFF = [
            { qty: 1, item: 'Armor' },
            { qty: 1, item: 'Jerry Can' }
        ];

        // Renders promo items as a bullet list.
        // Accepts either an array [{qty, item}] or a legacy plain text string.
        function formatPromoAsBullets(itemsArray, fallbackText) {
            let rows = [];

            if (itemsArray && Array.isArray(itemsArray) && itemsArray.length > 0) {
                // New format: fixed items first, then monthly items from array
                rows = [...FIXED_HAC_ITEMS_STAFF, ...itemsArray];
            } else if (fallbackText && fallbackText.trim() !== '' && fallbackText !== 'No promo text.') {
                // Legacy plain text fallback — parse "1 Armor 1 Jerry Can 100 Bandages"
                const parts = fallbackText.trim().split(/(?=\b\d+\s+[A-Z])/);
                rows = parts.map(s => s.trim()).filter(s => s.length > 0).map(s => {
                    const m = s.match(/^(\d+)\s+(.+)$/);
                    return m ? { qty: parseInt(m[1]), item: m[2] } : { qty: 1, item: s };
                });
            } else {
                return `<em style="color:#a0aec0;">No promo set.</em>`;
            }

            const listItems = rows.map(r =>
                `<li style="padding:3px 0;">${r.qty}x ${r.item}</li>`
            ).join('');
            return `<ul style="list-style:none; padding:0; margin:0; text-align:left;">${listItems}</ul>`;
        }

        // Keep old name as alias so nothing else breaks
        function formatPromoTextAsBullets(text) { return formatPromoAsBullets(null, text); }

        async function loadHacPromoForStaff() {
            try {
                const promoDocRef = firestore.doc(db, "siteSettings", "hacConfiguration");
                const docSnap = await firestore.getDoc(promoDocRef);
                if (docSnap.exists()) {
                    const pd = docSnap.data();
                    currentHacPromo = { month: pd.currentPromoMonth || 'N/A', text: pd.currentPromoText || 'No promo text.', items: pd.promoItems || null };
                } else { currentHacPromo = { month: 'N/A', text: 'No promo configured.', items: null };}
                if(hacPromoMonthStaffDisplayEl) hacPromoMonthStaffDisplayEl.textContent = currentHacPromo.month;
                if(hacPromoTextStaffDisplayEl) hacPromoTextStaffDisplayEl.innerHTML = formatPromoAsBullets(currentHacPromo.items, currentHacPromo.text);
            } catch (e) { currentHacPromo = { month: 'Error', text: 'Load failed.' };}
        }
        async function searchHacMembersForStaff() {
            if (!hacStaffSearchTermInputEl || !hacStaffSearchResultsDisplayEl) return;
            const searchTerm = hacStaffSearchTermInputEl.value.trim().toLowerCase();
            if (!searchTerm) {
                hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>Enter a name or phone to search.</i></p>";
                if(hacCurrentPromoDisplayStaffEl) hacCurrentPromoDisplayStaffEl.style.display = 'none'; return;
            }
            hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>Searching...</i></p>";
            try {
                const q = firestore.query(firestore.collection(db, "hacMembers"), firestore.orderBy("lastName"), firestore.orderBy("firstName"));
                const snap = await firestore.getDocs(q);
                let all = []; snap.forEach(d => all.push({id: d.id, ...d.data()}));
                const filtered = all.filter(m => `${m.firstName||''} ${m.lastName||''}`.toLowerCase().includes(searchTerm) || m.phoneNumber?.includes(searchTerm) || m.driverLicense?.toLowerCase().includes(searchTerm) || m.email?.toLowerCase().includes(searchTerm)  );
                renderHacSearchResultsForStaff(filtered);
            } catch(e) { hacStaffSearchResultsDisplayEl.innerHTML = "<p>Search error.</p>"; }
        }
function renderHacSearchResultsForStaff(members) {
            if (!hacStaffSearchResultsDisplayEl) return;
            hacStaffSearchResultsDisplayEl.innerHTML = '';
            
            if (members.length === 0) {
                hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>No HAC members found.</i></p>";
                if (hacCurrentPromoDisplayStaffEl) hacCurrentPromoDisplayStaffEl.style.display = 'none'; 
                return;
            }

            const now = new Date();

            members.forEach(mem => {
                const itemDiv = document.createElement('div'); 
                itemDiv.className = 'member-result-item';
                
                const eligClass = mem.isEligible ? 'hac-eligible' : 'hac-not-eligible';
                const eligText = mem.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                const purchaseDate = mem.membershipPurchaseDate?.toDate ? mem.membershipPurchaseDate.toDate().toLocaleDateString() : 'N/A';
                
                // --- TIER LOGIC ---
                const tier = mem.tier || 1;
                const tierLabel = tier === 2 ? `<span style="color: #f6e05e; font-weight: bold; margin-left: 5px;">(Tier 2)</span>` : `<span style="color: #61dafb; font-size: 0.8em; margin-left: 5px;">(Tier 1)</span>`;

                // --- EXPIRATION DISPLAY ---
                let expirationHtml = '';
                if (tier === 2 && mem.expirationDate) {
                    const expiry = mem.expirationDate.toDate();
                    const expiryStr = expiry.toLocaleDateString();
                    const isExpired = now > expiry;
                    
                    expirationHtml = isExpired 
                        ? `<br><span style="color: #e53e3e; font-weight: bold;">EXPIRED: Membership ended on ${expiryStr}</span>`
                        : `<br><span style="color: #48bb78;">VALID: Active until ${expiryStr}</span>`;
                } else {
                    expirationHtml = `<br><span style="color: #cbd5e0;">Status: Lifetime Member</span>`;
                }

                // --- BUTTON LOGIC (RESTRICTED TO TIER 1) ---
                let claimBtnHTML = ''; 
                // Only show the button if they are NOT Tier 2 and are ELIGIBLE
                if (tier !== 2 && mem.isEligible) {
                    claimBtnHTML = `<button class="action-button claim-benefit-button" data-member-id="${mem.id}" data-member-name="${mem.firstName} ${mem.lastName}">Claim Benefit</button>`;
                }

                itemDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>
                            <strong>${mem.firstName} ${mem.lastName}</strong> 
                            ${tierLabel}
                            <span class="${eligClass}">${eligText}</span>
                        </span>
                        ${claimBtnHTML}
                    </div>
                    <div style="font-size: 0.85em; color: #ccc;">
                        Phone: ${mem.phoneNumber || 'N/A'} | DL: ${mem.driverLicense || 'N/A'}
                        ${expirationHtml}
                        <br>Purchased: ${purchaseDate}
                    </div>`;
                
                hacStaffSearchResultsDisplayEl.appendChild(itemDiv);
            });

            hacStaffSearchResultsDisplayEl.querySelectorAll('.claim-benefit-button').forEach(b => b.addEventListener('click', handleClaimBenefitClick));
            
            if(hacPromoMonthStaffDisplayEl && hacPromoTextStaffDisplayEl && hacCurrentPromoDisplayStaffEl){
                hacPromoMonthStaffDisplayEl.textContent = currentHacPromo.month;
                hacPromoTextStaffDisplayEl.innerHTML = formatPromoAsBullets(currentHacPromo.items, currentHacPromo.text);
                hacCurrentPromoDisplayStaffEl.style.display = (currentHacPromo.month && currentHacPromo.month !== 'N/A') ? 'block' : 'none';
            }
        }
        async function handleClaimBenefitClick(event) {
            const btn = event.currentTarget; const id = btn.dataset.memberId; const name = btn.dataset.memberName;
            if(!confirm(`Mark ${name}'s benefit as claimed?`)) return;
            btn.disabled = true; btn.textContent = "Processing...";
            try {
                await firestore.updateDoc(firestore.doc(db, "hacMembers", id), { isEligible: false });
                alert(`${name}'s benefit claimed.`); searchHacMembersForStaff();
            } catch (e) { alert("Error."); btn.disabled = false; btn.textContent = "Claim Benefit"; }
        }

        function renderBuySellPageItems() {
            if (!mikesBuysItemsContainer || !mikesSellsItemsContainer) return;
            mikesBuysItemsContainer.innerHTML = ''; mikesSellsItemsContainer.innerHTML = '';
            Object.entries(buySellItemDefinitions.buy).forEach(([name, itemData]) => {
                mikesBuysItemsContainer.appendChild(createBuySellPageItemDiv(name, itemData, 'buy'));
            });
            Object.entries(buySellItemDefinitions.sell).forEach(([name, itemData]) => {
                mikesSellsItemsContainer.appendChild(createBuySellPageItemDiv(name, itemData, 'sell'));
            });
        }

        function createBuySellPageItemDiv(name, itemData, type) {
            const div = document.createElement('div');
            div.className = 'item buysell-page-item';
            div.setAttribute('data-price', itemData.price);
            div.setAttribute('data-name', name);
            div.setAttribute('data-type', type);
            const img = document.createElement('img');
            img.src = itemData.image || "Images/placeholder_buysell.jpg";
            img.alt = name;
            img.style.pointerEvents = "none";
            const p = document.createElement('p');
            p.textContent = `${name}: $${itemData.price.toLocaleString()}`;
            p.style.pointerEvents = "none";
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'quantity';
            input.min = "0";
            if (!buySellCart[type]) { buySellCart[type] = {}; }
            if (!buySellCart[type][name]) { buySellCart[type][name] = { quantity: 0, price: itemData.price }; }
            input.value = buySellCart[type][name].quantity;
            function updateInputStyleFromValue() { const val = parseInt(input.value) || 0; input.style.color = val > 0 ? 'limegreen' : '#a0aec0'; }
            updateInputStyleFromValue();
            input.addEventListener('input', () => {
                let currentQuantity = parseInt(input.value) || 0;
                if (currentQuantity < 0) { currentQuantity = 0; input.value = 0; }
                if (!buySellCart[type][name]) { buySellCart[type][name] = { quantity: 0, price: itemData.price }; }
                buySellCart[type][name].quantity = currentQuantity;
                updateInputStyleFromValue();
                updateBuySellViewTotals();
            });
            div.addEventListener('click', (event) => {
                if (event.target === input) { input.focus(); return; }
                if (!buySellCart[type][name]) { buySellCart[type][name] = { quantity: 0, price: itemData.price }; }
                buySellCart[type][name].quantity++;
                input.value = buySellCart[type][name].quantity;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            div.appendChild(img); div.appendChild(p); div.appendChild(input);
            return div;
        }

        function updateBuySellViewTotals() {
            let toCust = 0; Object.values(buySellCart.buy).forEach(i => {if(i) toCust += i.quantity * i.price});
            let toMikes = 0; Object.values(buySellCart.sell).forEach(i => {if(i)toMikes += i.quantity * i.price});
            if(totalOwedToCustomerDisplay) totalOwedToCustomerDisplay.textContent = toCust.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            if(totalOwedToMikesDisplay) totalOwedToMikesDisplay.textContent = toMikes.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            if(summaryOwedCustomerDisplay) summaryOwedCustomerDisplay.textContent = `$${toCust.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            if(summaryOwedMikesDisplay) summaryOwedMikesDisplay.textContent = `$${toMikes.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            const net = toMikes - toCust;
            if(netTransactionAmountDisplay) netTransactionAmountDisplay.textContent = `$${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            if(netTransactionPartyDisplay) netTransactionPartyDisplay.textContent = net > 0 ? "Customer Owes Mikes" : net < 0 ? "Mikes Owes Customer" : "Even Trade";
        }

        function clearBuySellSelections() {
            buySellCart.buy = {}; buySellCart.sell = {};
            document.querySelectorAll('#buysell-view-container .buysell-page-item input.quantity').forEach(i => { i.value = 0; i.style.color = '#a0aec0'; });
            updateBuySellViewTotals();
            if(buySellStatusMessage) buySellStatusMessage.textContent = '';
        }
        async function finalizeBuySellTrade() {
            if (!processingEmployeeSelect || !processingEmployeeSelect.value) { alert("No employee is logged in. Please log out and log back in."); return; }
            const empOpt = processingEmployeeSelect.options[processingEmployeeSelect.selectedIndex];
            const empName = empOpt.value;
            let empRank = empOpt.dataset.rank;
            // Prefer employeeData JSON if available (set by loadAndPopulateEmployees)
            if (empOpt.dataset.employeeData) {
                try { empRank = JSON.parse(empOpt.dataset.employeeData).rank || empRank; } catch(e) {}
            }
            let boughtVal = 0; Object.values(buySellCart.buy).forEach(i=>{if(i)boughtVal+=i.price*i.quantity});
            let soldVal = 0; Object.values(buySellCart.sell).forEach(i=>{if(i)soldVal+=i.price*i.quantity});
            if(boughtVal === 0 && soldVal === 0) {alert("No items."); return;}
            let itemsTraded = [];
            for(const type of ['buy', 'sell']) {Object.entries(buySellCart[type]).forEach(([n,d])=>{if(d && d.quantity>0)itemsTraded.push({itemName:n,quantity:d.quantity,pricePerUnit:d.price,type})})}
            const data = { transactionType:"Buy/Sell Trade", employeeName:empName, employeeRank:empRank || 'N/A', itemsTraded, totalValueBoughtFromCustomer:boughtVal, totalValueSoldToCustomer:soldVal, netAmountForMikes: soldVal - boughtVal, createdAt: firestore.serverTimestamp() };
            try {
                const ref = await firestore.addDoc(firestore.collection(db, "transactions"), data);
                if(buySellStatusMessage){buySellStatusMessage.textContent="Trade finalized!";buySellStatusMessage.style.color="green";}
                clearBuySellSelections(); setTimeout(()=> {if(buySellStatusMessage)buySellStatusMessage.textContent=''},3000);
            } catch(e){ if(buySellStatusMessage){buySellStatusMessage.textContent="Error: " + e.message ;buySellStatusMessage.style.color="red";}}
        }

        function attachAllEventListeners() {
            // Login dropdown: show password field when a name is selected
            const loginEmployeeSelect = document.getElementById('login-employee-select');
            const loginPasswordGroup = document.getElementById('login-password-group');
            const loginSubmitBtn = document.getElementById('login-submit-btn');
            if (loginEmployeeSelect) {
                loginEmployeeSelect.addEventListener('change', () => {
                    const selected = loginEmployeeSelect.value;
                    if (selected) {
                        if (loginPasswordGroup) loginPasswordGroup.style.display = 'block';
                        if (loginSubmitBtn) loginSubmitBtn.style.display = 'inline-block';
                        if (employeePasswordInput) { employeePasswordInput.value = ''; employeePasswordInput.focus(); }
                        if (mainLoginError) mainLoginError.style.display = 'none';
                    } else {
                        if (loginPasswordGroup) loginPasswordGroup.style.display = 'none';
                        if (loginSubmitBtn) loginSubmitBtn.style.display = 'none';
                    }
                });
            }

            if (employeeLoginForm) {
                employeeLoginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const selectedId = loginEmployeeSelect ? loginEmployeeSelect.value : '';
                    const enteredPassword = employeePasswordInput ? employeePasswordInput.value : '';
                    if (!selectedId) { return; }
                    const emp = loginEmployeeList.find(em => em.id === selectedId);
                    if (emp && emp.loginPassword && emp.loginPassword === enteredPassword) {
                        if (typeof grantEmployeeSession === "function") grantEmployeeSession();
                        localStorage.setItem('loggedInEmployeeName', emp.fullName);
                        updateLoginView(true);
                        await initializePageContentAfterLogin();
                    } else {
                        if (mainLoginError) { mainLoginError.textContent = "Incorrect password. Please try again."; mainLoginError.style.display = 'block'; }
                        if (employeePasswordInput) employeePasswordInput.value = "";
                    }
                });
            }
            if (showPosViewBtn) showPosViewBtn.addEventListener('click', switchToPosView);
            if (showBuySellViewBtn) showBuySellViewBtn.addEventListener('click', switchToBuySellView);
            if (posClearCartButton) posClearCartButton.addEventListener('click', clearMainPOSCart);
            if (posCheckoutButton) posCheckoutButton.addEventListener('click', checkoutPOS);
            if (buySellClearButton) buySellClearButton.addEventListener('click', clearBuySellSelections);
            if (buySellCheckoutButton) buySellCheckoutButton.addEventListener('click', finalizeBuySellTrade);
            if (categoryButtons) {
                categoryButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        categoryButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        filterAndDisplayPosItems();
                    });
                });
            }
            if (posItemSearchInput) { posItemSearchInput.addEventListener('input', filterAndDisplayPosItems); }
            if (posItemSearchClearBtn) { posItemSearchClearBtn.addEventListener('click', () => { if (posItemSearchInput) { posItemSearchInput.value = ""; } filterAndDisplayPosItems(); }); }

            if (hacMembershipItemEl) {
                const hacButton = hacMembershipItemEl.querySelector('.add-to-cart-hac');
                if (hacButton) hacButton.addEventListener('click', openHacSignupModal);
            }
            if (closeHacModalButtonEl) closeHacModalButtonEl.addEventListener('click', closeHacSignupModal);
            if (hacSignupModalEl) window.addEventListener('click', (event) => { if (event.target === hacSignupModalEl) closeHacSignupModal(); });
            if (submitHacSignupButtonEl) submitHacSignupButtonEl.addEventListener('click', submitHacMemberSignup);
            if(hacStaffSearchButtonEl) hacStaffSearchButtonEl.addEventListener('click', searchHacMembersForStaff);
            if(hacStaffSearchTermInputEl) hacStaffSearchTermInputEl.addEventListener('keypress', (e) => { if(e.key === 'Enter') {e.preventDefault(); searchHacMembersForStaff();} });
            if(hacStaffClearSearchButtonEl) {
                hacStaffClearSearchButtonEl.addEventListener('click', () => {
                    if(hacStaffSearchTermInputEl) hacStaffSearchTermInputEl.value = '';
                    if(hacStaffSearchResultsDisplayEl) hacStaffSearchResultsDisplayEl.innerHTML = "<p><i>Enter a name or phone to look up HAC member status.</i></p>";
                    if(hacCurrentPromoDisplayStaffEl) hacCurrentPromoDisplayStaffEl.style.display = 'none';
                });
            }

posItemsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity')) {
                calculateMainPOSTotal();
                renderCurrentCartSection();
            }
        });

        // Unified click listener for all POS items
        posItemsContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.item');
            
            // If we didn't click an item, or we clicked the quantity input/label directly, stop.
            if (!item || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;

            // CHECK: Is this a membership item?
            if (item.dataset.category === "Memberships") {
                // Open the HAC Signup Modal
                openHacSignupModal(item);
            } else {
                // Logic for regular items (increase quantity)
                const quantityInput = item.querySelector('.quantity');
                if (quantityInput) {
                    quantityInput.value = (parseInt(quantityInput.value) || 0) + 1;
                    // Manually dispatch 'input' event to trigger total calculations
                    quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

    }

        async function initializePageContentAfterLogin() {
            await Promise.all([
                loadAndPopulateEmployees(),
                loadAndRenderDynamicPosItems(),
                loadHacPromoForStaff(),
                loadShiftNoteBanner()
            ]);
            
            cacheAllPosItems();
            
            if (showPosViewBtn && typeof showPosViewBtn.click === 'function') { 
                showPosViewBtn.click();
            } else { 
                switchToPosView(); 
            }
            
            if (typeof initPackTracker === 'function') { 
                initPackTracker();
            }
        }

        async function initializePageOnLoad() {
            attachAllEventListeners();
            if (typeof checkEmployeeSession === "function" && checkEmployeeSession()) {
                updateLoginView(true);
                await initializePageContentAfterLogin();
            } else {
                if (typeof checkEmployeeSession !== "function") console.error("Index page: checkEmployeeSession from utility.js is not available!");
                updateLoginView(false);
                await loadLoginEmployeeList();
            }
            hideLoadingScreen();
        }

        function filterAndDisplayPosItems() {
            if (!posItemsContainer) return;
            const searchTerm = posItemSearchInput ? posItemSearchInput.value.toLowerCase().trim() : "";
            const activeCategoryButton = document.querySelector('#category-buttons-container .category-button.active');
            const categoryFilter = activeCategoryButton ? activeCategoryButton.dataset.categoryFilter : "All";
            
            allPosItemElements.forEach(item => {
                const itemName = (item.querySelector('p')?.textContent || "").toLowerCase();
                const itemCategory = item.dataset.category;
                
                const categoryMatch = (categoryFilter === "All" || itemCategory === categoryFilter);
                const searchMatch = (searchTerm === "" || itemName.includes(searchTerm));

                if (item.id === 'hac-membership-item' && item.getAttribute('data-hac-member-sale') === 'true') {
                    item.style.display = 'flex';
                } else if (categoryMatch && searchMatch) { 
                    item.style.display = 'flex';
                } else { 
                    item.style.display = 'none'; 
                }
            });
            calculateMainPOSTotal();
        }
        
        initializePageOnLoad();
    }

    let firebaseReadyProcessed = false;
    document.addEventListener('firebaseReady', (e) => {
        if (!appLogicHasRun && !firebaseReadyProcessed) {
            firebaseReadyProcessed = true;
            executeMainAppLogic(e.detail);
        }
    });
    document.addEventListener('firebaseError', (e) => {
        if (!appLogicHasRun && !firebaseReadyProcessed) {
            firebaseReadyProcessed = true;
            setupErrorUI("Firebase SDK init failed in HTML. " + (e.detail?.error?.message || "Unknown error."));
        }
    });
    setTimeout(() => {
        if (!appLogicHasRun && !firebaseReadyProcessed) {
            if (window.isFirebaseReady === true && window.db && window.firestoreFunctions) {
                executeMainAppLogic({ db: window.db, functions: window.firestoreFunctions });
            } else if (window.isFirebaseReady === false) {
                setupErrorUI("App init timeout. Firebase reported an error during HTML setup.");
            } else {
                setupErrorUI("App init timeout. Firebase status unknown.");
            }
        }
    }, 3500);

});

const packDefinitions = {
  hunting_pack: { "Hunting Rifle": 1, "30.06 Ammo": 100, "Bait (Choice Of)": 10, "Knife": 1, "Hunting Map": 1, "Orange Hunting Vest": 1, },
  scoped_hunting_pack: { "Scoped Rifle": 1, "30.06 Ammo": 100, "Bait (Choice Of)": 10, "Knife": 1, "Hunting Map": 1, },
  fishing_pack: { "COOLERS": 1, "Beer": 10, "MSG TAILGATE CHAIR": 2, },
  scuba_pack: { "Scuba Tank": 2, "Shark Repellent": 2, "Bandages": 10, },
  camping_pack: { "COOLERS": 2, "MSG TAILGATE CHAIR": 2, "Beer": 20, "Binoculars": 2, },
  tiny_biters_pack: { "Value Cast Rod": 1, "Broke Ass Reel": 1, "Cheap Mono Line": 10, "HOOK #1": 10, "MAGGOTS BAIT": 50, },
  trout_pack: { "Value Cast Rod": 1, "Broke Ass Reel": 1, "Cheap Mono Line": 10, "HOOK #2": 10, "WAXWORMS BAIT": 50, },
  big_boy_pack: { "Elemental Rod": 1, "LINE SNIFFER REEL": 1, "BITE SIZE LINE": 10, "HOOK #2": 10, "HOOK #6": 10, "NIGHTWORMS BAIT": 50, },
  dock_special_pack: { "Brutas Rod": 1, "FISHRUS REEL": 1, "NOODLE LINE": 10, "HOOK #3": 10, "MAGGOTS BAIT": 50, },
  pike_pack: { "Nero Rod": 1, "Rock Bottom Reel": 1, "Mobey Mono Line": 10, "HOOK #3": 10, "NIGHTWORMS BAIT": 50, },
  tuna_pack: { "Zeus Rod": 1, "Thunder Reel": 1, "LIGHTNING LINE": 10, "HOOK #10": 10, "LEECH BAIT": 50, },
  mahi_pack: { "Elemental Rod": 1, "LINE SNIFFER REEL": 1, "BITE SIZE LINE": 10, "HOOK #1": 10, },
  summer_camping_pack: {"MSG Chair": 2, "MSG Cooler": 1, "Beer": 12, "Beach Ring": 2, "Shark Repellent": 2},
  the_master_baiter_pack: {"Zilla Reel": 1, "Magnum XL Rod": 1, "King Braid Line": 10, "Tackle Box": 1, "Fish Finder": 1, "#3 Hooks": 10, "#10 Hooks": 10,},
};
const displayedPackItems = {};
const selectedPackQuantities = {};

function initPackTracker() {
    const packItemElements = document.querySelectorAll('#pos-items-container .item[data-pack="true"]');
    let packBox = document.getElementById('pack-display-box');
    if (!packBox) return;
    
    packItemElements.forEach(itemDiv => {
        const input = itemDiv.querySelector('input.quantity');
        if (!input || !input.id || !input.id.startsWith('quantity_')) return;
        
        const packId = input.id.replace('quantity_', '');
        if (!packDefinitions[packId]) return;

        selectedPackQuantities[packId] = parseInt(input.value) || 0;

        input.addEventListener('input', () => {
            if (document.getElementById('pos-view-container')?.style.display === 'none') return;
            handlePackChange(packId, parseInt(input.value) || 0);
            if (typeof calculateMainPOSTotal === 'function') calculateMainPOSTotal();
        });
    });
    updateDisplayBox();
}

function handlePackChange(packId, newQuantity) {
    const oldQuantity = selectedPackQuantities[packId] || 0;
    if (newQuantity === oldQuantity) return;

    const packContents = packDefinitions[packId];
    if (!packContents) return;

    let quantityChange = newQuantity - oldQuantity;
    for (const [item, countPerPack] of Object.entries(packContents)) {
        displayedPackItems[item] = (displayedPackItems[item] || 0) + (countPerPack * quantityChange);
        if (displayedPackItems[item] < 0) displayedPackItems[item] = 0;
    }
    selectedPackQuantities[packId] = newQuantity;
    updateDisplayBox();
}

function updateDisplayBox() {
    const boxDiv = document.getElementById('pack-display-box');
    if (!boxDiv) return;

    const listDiv = boxDiv.querySelector('#pack-item-list');
    if (!listDiv) return;
    
    listDiv.innerHTML = '';
    const entries = Object.entries(displayedPackItems).filter(([, count]) => count > 0);

    if (entries.length === 0) {
        boxDiv.style.maxHeight = '0px';
        boxDiv.style.paddingTop = '0px';
        boxDiv.style.paddingBottom = '0px';
        return;
    }

    boxDiv.style.display = 'block';
    boxDiv.style.padding = '15px';
    boxDiv.style.marginTop = '20px';
    
    entries.forEach(([item, count]) => {
        const div = document.createElement('div');
        div.textContent = `${item}: ${count}`;
        div.style.marginBottom = '4px';
        listDiv.appendChild(div);
    });

    const h3Height = boxDiv.querySelector('h3').offsetHeight;
    const listHeight = listDiv.scrollHeight;
    const totalHeight = h3Height + listHeight + 40;
    boxDiv.style.maxHeight = `${totalHeight}px`;

}