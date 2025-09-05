// Global variables
let currentUser = null;
let currentDatasets = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to load
    setTimeout(() => {
        initializeApp();
    }, 1000);
});

function initializeApp() {
    console.log('Initializing application...');
    loadStatistics();
    loadSampleData();
    setupEventListeners();
}

function setupEventListeners() {
    // Auth form submission
    document.getElementById('auth-form').addEventListener('submit', handleLogin);
    
    // Filter changes
    document.getElementById('tissue-filter').addEventListener('change', filterData);
    document.getElementById('celltype-filter').addEventListener('change', filterData);
    document.getElementById('gene-search').addEventListener('input', debounce(filterData, 500));
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.remove('d-none');
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
}

// Authentication functions
function showLogin() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await window.firebase.signInWithEmailAndPassword(window.firebase.auth, email, password);
        console.log('Login successful:', userCredential.user);
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        showNotification('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed: ' + error.message, 'error');
    }
}

async function registerUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const userCredential = await window.firebase.createUserWithEmailAndPassword(window.firebase.auth, email, password);
        console.log('Registration successful:', userCredential.user);
        
        // Create user profile in Firestore
        await window.firebase.setDoc(window.firebase.doc(window.firebase.db, 'users', userCredential.user.uid), {
            email: email,
            createdAt: new Date(),
            quotaUsed: 0,
            lastActive: new Date()
        });
        
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        showNotification('Registration successful!', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed: ' + error.message, 'error');
    }
}

async function logout() {
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
        document.getElementById('dataset-count').textContent = datasetsSnapshot.size.toLocaleString();
        document.getElementById('cell-count').textContent = totalCells.toLocaleString();
        document.getElementById('tissue-count').textContent = tissues.size.toLocaleString();
        document.getElementById('analysis-count').textContent = '0'; // Will be updated when analyses are loaded
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Show placeholder data
        document.getElementById('dataset-count').textContent = '12';
        document.getElementById('cell-count').textContent = '1,234,567';
        document.getElementById('tissue-count').textContent = '15';
        document.getElementById('analysis-count').textContent = '8,901';
    }
}

async function loadSampleData() {
    // Create sample datasets if none exist
    try {
        const datasetsSnapshot = await window.firebase.getDocs(window.firebase.collection(window.firebase.db, 'datasets'));
        
        if (datasetsSnapshot.empty) {
            console.log('No datasets found, creating sample data...');
            await createSampleDatasets();
        }
        
        await loadDatasets();
        await loadFilters();
    } catch (error) {
        console.error('Error loading sample data:', error);
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
        }
    ];
    
    for (const dataset of sampleDatasets) {
        await window.firebase.setDoc(window.firebase.doc(window.firebase.db, 'datasets', dataset.id), dataset);
    }
    
    console.log('Sample datasets created');
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
    }
}

function displayDatasets(datasets) {
    const tbody = document.getElementById('dataset-tbody');
    tbody.innerHTML = '';
    
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
        
        // Populate tissue filter
        const tissueFilter = document.getElementById('tissue-filter');
        tissueFilter.innerHTML = '<option value="">All Tissues</option>';
        Array.from(tissues).sort().forEach(tissue => {
            const option = document.createElement('option');
            option.value = tissue;
            option.textContent = tissue;
            tissueFilter.appendChild(option);
        });
        
        // Populate cell type filter
        const cellTypeFilter = document.getElementById('celltype-filter');
        cellTypeFilter.innerHTML = '<option value="">All Cell Types</option>';
        Array.from(cellTypes).sort().forEach(cellType => {
            const option = document.createElement('option');
            option.value = cellType;
            option.textContent = cellType;
            cellTypeFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Data filtering and search
function filterData() {
    const tissueFilter = document.getElementById('tissue-filter').value;
    const cellTypeFilter = document.getElementById('celltype-filter').value;
    const geneSearch = document.getElementById('gene-search').value.toLowerCase();
    
    let filteredDatasets = currentDatasets.filter(dataset => {
        let matchesTissue = !tissueFilter || dataset.tissue === tissueFilter;
        let matchesCellType = !cellTypeFilter || (dataset.cellTypes && dataset.cellTypes.includes(cellTypeFilter));
        let matchesGene = !geneSearch || dataset.description.toLowerCase().includes(geneSearch);
        
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
        // TODO: Implement dataset visualization
        console.log('View dataset:', dataset);
    }
}

function analyzeDataset(datasetId) {
    const dataset = currentDatasets.find(d => d.id === datasetId);
    if (dataset) {
        showNotification(`Starting analysis for: ${dataset.name}`, 'info');
        // TODO: Implement analysis workflow
        console.log('Analyze dataset:', dataset);
    }
}

function showAnalysisModal(analysisType) {
    showNotification(`${analysisType} analysis coming soon!`, 'info');
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
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
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
