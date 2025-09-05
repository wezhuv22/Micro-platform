// Global variables
let currentUser = null;
let currentDatasets = [];
let isFirebaseReady = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Wait for Firebase to load
    setTimeout(() => {
        if (window.firebase) {
            isFirebaseReady = true;
            initializeApp();
        } else {
            console.error('Firebase not loaded, retrying...');
            setTimeout(() => {
                if (window.firebase) {
                    isFirebaseReady = true;
                    initializeApp();
                } else {
                    console.error('Firebase failed to load');
                    showFallbackData();
                }
            }, 2000);
        }
    }, 1500);
});

function initializeApp() {
    console.log('Initializing application...');
    setupEventListeners();
    loadStatistics();
    loadSampleData();
}

function setupEventListeners() {
    // Auth form submission
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleLogin);
    }
    
    // Filter changes
    const tissueFilter = document.getElementById('tissue-filter');
    const celltypeFilter = document.getElementById('celltype-filter');
    const geneSearch = document.getElementById('gene-search');
    
    if (tissueFilter) tissueFilter.addEventListener('change', filterData);
    if (celltypeFilter) celltypeFilter.addEventListener('change', filterData);
    if (geneSearch) geneSearch.addEventListener('input', debounce(filterData, 500));
}

// Navigation functions
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Authentication functions
function showLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        const modal = new bootstrap.Modal(loginModal);
        modal.show();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    if (!isFirebaseReady) {
        showNotification('System is still loading, please try again', 'warning');
        return;
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await window.firebase.signInWithEmailAndPassword(window.firebase.auth, email, password);
        console.log('Login successful:', userCredential.user);
        
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        showNotification('Login successful!', 'success');
        
        // Clear form
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later';
                break;
            default:
                errorMessage = error.message || 'Login failed';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

async function registerUser() {
    if (!isFirebaseReady) {
        showNotification('System is still loading, please try again', 'warning');
        return;
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await window.firebase.createUserWithEmailAndPassword(window.firebase.auth, email, password);
        console.log('Registration successful:', userCredential.user);
        
        // Create user profile in Firestore
        await window.firebase.setDoc(window.firebase.doc(window.firebase.db, 'users', userCredential.user.uid), {
            email: email,
            createdAt: new Date(),
            quotaUsed: 0,
            lastActive: new Date()
        });
        
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        showNotification('Registration successful!', 'success');
        
        // Clear form
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak';
                break;
            default:
                errorMessage = error.message || 'Registration failed';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    if (!isFirebaseReady) {
        showNotification('System is still loading', 'warning');
        return;
    }
    
    try {
        await window.firebase.signOut(window.firebase.auth);
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed', 'error');
    }
}

// Data loading functions
async function loadStatistics() {
    try {
        if (!isFirebaseReady) {
            showFallbackStats();
            return;
        }
        
        // Load dataset statistics from Firestore
        const datasetsSnapshot = await window.firebase.getDocs(window.firebase.collection(window.firebase.db, 'datasets'));
        
        let totalCells = 0;
        let totalGenes = 0;
        const tissues = new Set();
        
        datasetsSnapshot.forEach(doc => {
            const data = doc.data();
            totalCells += data.cellCount || 0;
            totalGenes += data.geneCount || 0;
            if (data.tissue) tissues.add(data.tissue);
        });
        
        // Update statistics display
        updateStatElement('dataset-count', datasetsSnapshot.size);
        updateStatElement('cell-count', totalCells);
        updateStatElement('tissue-count', tissues.size);
        updateStatElement('analysis-count', 0); // Will be updated when analyses are loaded
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        showFallbackStats();
    }
}

function showFallbackStats() {
    updateStatElement('dataset-count', 12);
    updateStatElement('cell-count', 1234567);
    updateStatElement('tissue-count', 15);
    updateStatElement('analysis-count', 8901);
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
    }
}

async function loadSampleData() {
    try {
        if (!isFirebaseReady) {
            console.log('Firebase not ready, loading fallback data');
            loadFallbackDatasets();
            return;
        }
        
        // Check if datasets exist
        const datasetsSnapshot = await window.firebase.getDocs(window.firebase.collection(window.firebase.db, 'datasets'));
        
        if (datasetsSnapshot.empty) {
            console.log('No datasets found, creating sample data...');
            await createSampleDatasets();
        }
        
        await loadDatasets();
        await loadFilters();
    } catch (error) {
        console.error('Error loading sample data:', error);
        loadFallbackDatasets();
    }
}

async function createSampleDatasets() {
    const sampleDatasets = [
        {
            id: 'heart_001',
            name: 'Human Heart scRNA-seq',
            tissue: 'Heart',
            cellCount: 45678,
            geneCount: 23456,
            description: 'Single-cell RNA sequencing of human heart tissue',
            status: 'ready',
            uploadDate: new Date(),
            cellTypes: ['Cardiomyocytes', 'Fibroblasts', 'Endothelial cells', 'Immune cells']
        },
        {
            id: 'brain_001',
            name: 'Human Brain Cortex scRNA-seq',
            tissue: 'Brain',
            cellCount: 67890,
            geneCount: 25678,
            description: 'Single-cell analysis of human cortical neurons',
            status: 'ready',
            uploadDate: new Date(),
            cellTypes: ['Neurons', 'Astrocytes', 'Oligodendrocytes', 'Microglia']
        },
        {
            id: 'liver_001',
            name: 'Human Liver scRNA-seq',
            tissue: 'Liver',
            cellCount: 34567,
            geneCount: 21234,
            description: 'Hepatocyte and non-parenchymal cell analysis',
            status: 'ready',
            uploadDate: new Date(),
            cellTypes: ['Hepatocytes', 'Kupffer cells', 'Stellate cells', 'Endothelial cells']
        },
        {
            id: 'lung_001',
            name: 'Human Lung scRNA-seq',
            tissue: 'Lung',
            cellCount: 56789,
            geneCount: 24567,
            description: 'Respiratory epithelial and immune cell analysis',
            status: 'ready',
            uploadDate: new Date(),
            cellTypes: ['Pneumocytes', 'Alveolar macrophages', 'T cells', 'B cells']
        },
        {
            id: 'kidney_001',
            name: 'Human Kidney scRNA-seq',
            tissue: 'Kidney',
            cellCount: 43210,
            geneCount: 22345,
            description: 'Nephron and collecting duct cell analysis',
            status: 'ready',
            uploadDate: new Date(),
            cellTypes: ['Podocytes', 'Tubular cells', 'Mesangial cells', 'Endothelial cells']
        }
    ];
    
    for (const dataset of sampleDatasets) {
        await window.firebase.setDoc(window.firebase.doc(window.firebase.db, 'datasets', dataset.id), dataset);
    }
    
    console.log('Sample datasets created');
}

function loadFallbackDatasets() {
    currentDatasets = [
        {
            id: 'heart_001',
            name: 'Human Heart scRNA-seq',
            tissue: 'Heart',
            cellCount: 45678,
            geneCount: 23456,
            description: 'Single-cell RNA sequencing of human heart tissue',
            cellTypes: ['Cardiomyocytes', 'Fibroblasts', 'Endothelial cells', 'Immune cells']
        },
        {
            id: 'brain_001',
            name: 'Human Brain Cortex scRNA-seq',
            tissue: 'Brain',
            cellCount: 67890,
            geneCount: 25678,
            description: 'Single-cell analysis of human cortical neurons',
            cellTypes: ['Neurons', 'Astrocytes', 'Oligodendrocytes', 'Microglia']
        },
        {
            id: 'liver_001',
            name: 'Human Liver scRNA-seq',
            tissue: 'Liver',
            cellCount: 34567,
            geneCount: 21234,
            description: 'Hepatocyte and non-parenchymal cell analysis',
            cellTypes: ['Hepatocytes', 'Kupffer cells', 'Stellate cells', 'Endothelial cells']
        }
    ];
    
    displayDatasets(currentDatasets);
    loadFallbackFilters();
}

function loadFallbackFilters() {
    const tissues = [...new Set(currentDatasets.map(d => d.tissue))];
    const cellTypes = [...new Set(currentDatasets.flatMap(d => d.cellTypes || []))];
    
    populateFilter('tissue-filter', tissues);
    populateFilter('celltype-filter', cellTypes);
}

async function loadDatasets() {
    try {
        const datasetsSnapshot = await window.firebase.getDocs(
            window.firebase.query(
                window.firebase.collection(window.firebase.db, 'datasets'),
                window.firebase.orderBy('uploadDate', 'desc')
            )
        );
        
        currentDatasets = [];
        datasetsSnapshot.forEach(doc => {
            currentDatasets.push({ id: doc.id, ...doc.data() });
        });
        
        displayDatasets(currentDatasets);
    } catch (error) {
        console.error('Error loading datasets:', error);
        loadFallbackDatasets();
    }
}

function displayDatasets(datasets) {
    const tbody = document.getElementById('dataset-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (datasets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No datasets found</td></tr>';
        return;
    }
    
    datasets.forEach(dataset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dataset.id}</td>
            <td>${dataset.tissue}</td>
            <td>${dataset.cellCount.toLocaleString()}</td>
            <td>${dataset.geneCount.toLocaleString()}</td>
            <td>${dataset.description}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewDataset('${dataset.id}')">View</button>
                <button class="btn btn-sm btn-outline-primary" onclick="analyzeDataset('${dataset.id}')">Analyze</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadFilters() {
    try {
        const datasetsSnapshot = await window.firebase.getDocs(window.firebase.collection(window.firebase.db, 'datasets'));
        
        const tissues = new Set();
        const cellTypes = new Set();
        
        datasetsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.tissue) tissues.add(data.tissue);
            if (data.cellTypes) {
                data.cellTypes.forEach(type => cellTypes.add(type));
            }
        });
        
        populateFilter('tissue-filter', Array.from(tissues).sort());
        populateFilter('celltype-filter', Array.from(cellTypes).sort());
        
    } catch (error) {
        console.error('Error loading filters:', error);
        loadFallbackFilters();
    }
}

function populateFilter(filterId, options) {
    const filter = document.getElementById(filterId);
    if (!filter) return;
    
    const currentValue = filter.value;
    const defaultOption = filter.querySelector('option[value=""]');
    
    filter.innerHTML = '';
    
    if (defaultOption) {
        filter.appendChild(defaultOption);
    }
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        filter.appendChild(optionElement);
    });
    
    filter.value = currentValue;
}

// Data filtering and search
function filterData() {
    const tissueFilter = document.getElementById('tissue-filter').value;
    const cellTypeFilter = document.getElementById('celltype-filter').value;
    const geneSearch = document.getElementById('gene-search').value.toLowerCase();
    
    let filteredDatasets = currentDatasets.filter(dataset => {
        let matchesTissue = !tissueFilter || dataset.tissue === tissueFilter;
        let matchesCellType = !cellTypeFilter || (dataset.cellTypes && dataset.cellTypes.includes(cellTypeFilter));
        let matchesGene = !geneSearch || dataset.description.toLowerCase().includes(geneSearch) || dataset.name.toLowerCase().includes(geneSearch);
        
        return matchesTissue && matchesCellType && matchesGene;
    });
    
    displayDatasets(filteredDatasets);
}

function clearFilters() {
    document.getElementById('tissue-filter').value = '';
    document.getElementById('celltype-filter').value = '';
    document.getElementById('gene-search').value = '';
    displayDatasets(currentDatasets);
}

// Dataset interaction functions
function viewDataset(datasetId) {
    const dataset = currentDatasets.find(d => d.id === datasetId);
    if (dataset) {
        showNotification(`Viewing dataset: ${dataset.name}`, 'info');
        console.log('View dataset:', dataset);
        // TODO: Implement dataset visualization
    }
}

function analyzeDataset(datasetId) {
    const dataset = currentDatasets.find(d => d.id === datasetId);
    if (dataset) {
        showNotification(`Starting analysis for: ${dataset.name}`, 'info');
        console.log('Analyze dataset:', dataset);
        // TODO: Implement analysis workflow
    }
}

function showAnalysisModal(analysisType) {
    showNotification(`${analysisType} analysis coming soon!`, 'info');
    console.log('Analysis type:', analysisType);
    // TODO: Implement analysis modals
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
        }
    }
}

function showFallbackData() {
    console.log('Loading fallback data due to Firebase connection issues');
    showFallbackStats();
    loadFallbackDatasets();
    showNotification('Running in offline mode - some features may be limited', 'warning');
}

// Make functions globally available
window.showSection = showSection;
window.showLogin = showLogin;
window.registerUser = registerUser;
window.logout = logout;
window.filterData = filterData;
window.clearFilters = clearFilters;
window.viewDataset = viewDataset;
window.analyzeDataset = analyzeDataset;
window.showAnalysisModal = showAnalysisModal;
