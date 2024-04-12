import { useEffect } from 'react';

const Narrator = ({ textArray }) => {

    useEffect(() => {
        const speechSynthesisUtterance = new SpeechSynthesisUtterance();
        speechSynthesisUtterance.lang = 'pt-BR';

        const speakText = () => {
            speechSynthesisUtterance.text = textArray;
            speechSynthesis.speak(speechSynthesisUtterance);
        };

        speakText();
    }, [textArray]);

};

export default Narrator;
