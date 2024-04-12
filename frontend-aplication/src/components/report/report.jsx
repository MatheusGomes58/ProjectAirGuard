import React, { useState } from 'react';
import './report.css'

function ReportForm({ onSubmit, addImage }) {
    const [reportText, setReportText] = useState('');
    const [formSubmitted, setFormSubmitted] = useState(false);

    const handleTextChange = (event) => {
        setReportText(event.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (formSubmitted) {
            return;
        }
        if (reportText.trim() === '') {
            alert('Por favor, preencha o relatório antes de enviar.');
            return;
        }
        setFormSubmitted(true);
        onSubmit(reportText);
    };

    return (
        <form className='report-form' onSubmit={handleSubmit}>
            <textarea value={reportText} onChange={handleTextChange} />
            <input className='inputText' type="file" accept="image/*" multiple onChange={addImage} />
            <button className='inputText' type="submit" disabled={formSubmitted}>Enviar Relatório</button>
        </form>
    );
}

export default ReportForm;
