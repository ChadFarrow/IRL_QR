let currentStep = 0;
const totalSteps = 7;

const steps = document.querySelectorAll('.step');
const stepDots = document.querySelectorAll('.step-dot');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

function showStep(stepIndex) {
    // Hide all steps
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    if (steps[stepIndex]) {
        steps[stepIndex].classList.add('active');
    }
    
    // Update dots
    stepDots.forEach((dot, index) => {
        if (index === stepIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Update buttons
    prevBtn.disabled = stepIndex === 0;
    nextBtn.disabled = stepIndex === totalSteps - 1;
    
    currentStep = stepIndex;
}

function goToStep(stepIndex) {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
        showStep(stepIndex);
    }
}

function nextStep() {
    if (currentStep < totalSteps - 1) {
        goToStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 0) {
        goToStep(currentStep - 1);
    }
}

// Event listeners
prevBtn.addEventListener('click', prevStep);
nextBtn.addEventListener('click', nextStep);

// Dot click handlers
stepDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        goToStep(index);
    });
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevStep();
    } else if (e.key === 'ArrowRight') {
        nextStep();
    }
});

// Initialize
showStep(0);

