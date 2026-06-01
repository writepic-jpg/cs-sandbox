// assets/js/contact.js
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('hub-contact-form');
    const feedbackPanel = document.getElementById('contact-feedback');

    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitButton.innerHTML;
        
        // Show immediate visual state changes upon user submission
        submitButton.disabled = true;
        submitButton.innerHTML = `<span>⏳ Processing Delivery Request...</span>`;

        // Clear baseline visibility configurations
        feedbackPanel.className = "hidden text-xs py-2 px-3 rounded-lg border font-mono";
        feedbackPanel.innerHTML = "";

        // Collect matching input values from HTML fields
        const formData = new FormData(contactForm);
        const payload = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message')
        };

        try {
            // Talk directly to our relative Vercel route
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Apply successful styling and message feedback
                feedbackPanel.classList.remove('hidden');
                feedbackPanel.classList.add('bg-emerald-950/30', 'border-emerald-800/60', 'text-emerald-400');
                feedbackPanel.innerHTML = `✓ Message sent successfully! An expert will review your query.`;
                contactForm.reset();
            } else {
                throw new Error(data.error || 'Server processing error occurred.');
            }

        } catch (error) {
            // Apply error styling and message feedback
            feedbackPanel.classList.remove('hidden');
            feedbackPanel.classList.add('bg-rose-950/30', 'border-rose-800/60', 'text-rose-400');
            feedbackPanel.innerHTML = `⚠️ Error: ${error.message}`;
        } finally {
            // Restore interactive capability to the UI buttons
            submitButton.disabled = false;
            submitButton.innerHTML = originalBtnText;
        }
    });
});