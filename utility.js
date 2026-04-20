const EMPLOYEE_SESSION_KEY = 'isEmployeeAccessGranted_MikesMSG';
const MANAGER_SESSION_KEY = 'isManagerAccessGranted_MikesMSG';

function checkEmployeeSession() {
    // console.log("Utility: Checking Employee Session - Value:", sessionStorage.getItem(EMPLOYEE_SESSION_KEY));
    return sessionStorage.getItem(EMPLOYEE_SESSION_KEY) === 'true';
}

function grantEmployeeSession() {
    console.log("Utility: Granting Employee Session");
    sessionStorage.setItem(EMPLOYEE_SESSION_KEY, 'true');
}

function checkManagerSession() {
    const managerHasAccess = sessionStorage.getItem(MANAGER_SESSION_KEY) === 'true';
    const employeeHasAccess = checkEmployeeSession();
    // console.log(`Utility: Checking Manager Session - Manager Flag: ${managerHasAccess}, Employee Flag: ${employeeHasAccess}`);
    return managerHasAccess && employeeHasAccess;
}

function grantManagerSession() {
    console.log("Utility: Granting Manager Session (and Employee Session)");
    sessionStorage.setItem(EMPLOYEE_SESSION_KEY, 'true');
    sessionStorage.setItem(MANAGER_SESSION_KEY, 'true');
}

function clearAllSessions() {
    console.log("Utility: Clearing All Sessions");
    sessionStorage.removeItem(EMPLOYEE_SESSION_KEY);
    sessionStorage.removeItem(MANAGER_SESSION_KEY);
    localStorage.removeItem('loggedInEmployeeName');

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink && logoutLink.parentNode) {
        logoutLink.parentNode.removeChild(logoutLink);
    }

    const currentPageFilename = window.location.pathname.split("/").pop() || "index.html"; // Default to index.html if path is just "/"
    const isAlreadyOnALoginPage = ["index.html", "buy_sell_goods.html", "taxes.html", "manager.html"].includes(currentPageFilename);

    if (isAlreadyOnALoginPage) {
        window.location.reload(); // Reload current page to show its login form
    } else {
        window.location.href = 'index.html'; // Redirect to main login page
    }
}

function addLogoutButton() {
    const dropdownContent = document.querySelector('.navbar .dropdown-content');
    if (dropdownContent && !document.getElementById('logout-link')) {
        const logoutLink = document.createElement('a');
        logoutLink.href = "#";
        logoutLink.id = 'logout-link';
        logoutLink.textContent = 'Logout';
        logoutLink.style.color = '#ff8c8c';
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            clearAllSessions();
        });
        // Check if there are other links to append after, or just append
        const lastLink = dropdownContent.querySelector('a:last-of-type');
        if (lastLink && lastLink.nextSibling) {
             dropdownContent.insertBefore(logoutLink, lastLink.nextSibling);
        } else {
            dropdownContent.appendChild(logoutLink);
        }
        console.log("Utility: Logout button added.");
    } else if (!dropdownContent) {
        console.warn("Utility: Could not find .navbar .dropdown-content to add logout button.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
  const scrollBtn = document.getElementById('scroll-to-bottom-btn');
  if (!scrollBtn) return; // Not present on all pages

  function checkVisibility() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const fullHeight = document.documentElement.scrollHeight;

    const contentLongerThanViewport = fullHeight > viewportHeight + 20;
    const nearBottom = scrollTop + viewportHeight >= fullHeight - 100;

    if (contentLongerThanViewport && !nearBottom) {
      scrollBtn.style.display = 'block';
    } else {
      scrollBtn.style.display = 'none';
    }
  }

  // Show/hide immediately on load
  checkVisibility();

  // Update on scroll & resize
  window.addEventListener('scroll', checkVisibility);
  window.addEventListener('resize', checkVisibility);

  // Smooth scroll to bottom when clicked
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.querySelector('.dropdown');
  const dropdownContent = document.querySelector('.dropdown-content');
  if (!dropdown || !dropdownContent) return;

  let hideTimeout;

  dropdown.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
    dropdownContent.style.display = 'block';
  });

  dropdown.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(() => {
      dropdownContent.style.display = 'none';
    }, 4000); // adjust delay as needed
  });

  dropdownContent.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
  });

  dropdownContent.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(() => {
      dropdownContent.style.display = 'none';
    }, 400);
  });
});

const employeeSelector = document.getElementById('employee-selector');

if (employeeSelector) {
  employeeSelector.addEventListener('change', (e) => {
    const selectedName = e.target.value;
    console.log("Employee selected:", selectedName);

    if (selectedName) {
      // ✅ Save to localStorage for other pages:
      localStorage.setItem('loggedInEmployeeName', selectedName);
    } else {
      // If they re-select empty, clear it
      localStorage.removeItem('loggedInEmployeeName');
    }
  });
}

