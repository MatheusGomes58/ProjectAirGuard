import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { collection, addDoc } from 'firebase/firestore';
import './apirest.css';

function ApiRest() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const endpoint = searchParams.get("endpoint");
    const param = window.location.search.substring(1); // Captura a query string completa

    const [inputEndpoint, setInputEndpoint] = useState('');
    const [inputParam, setInputParam] = useState('');

    React.useEffect(() => {
        if (endpoint && param) {
            console.log("Calling API with params:", param);
            handleApiCall(endpoint, param);
        }
    }, [endpoint, param]);

    const handleApiCall = (endpoint, param) => {
        if (!param) {
            console.error("Param is null or undefined");
            return;
        }

        // Converte o param em um objeto JSON
        const paramObj = param.split('&').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            acc[key] = decodeURIComponent(value); // Decodifica valores de URL
            return acc;
        }, {});

        console.log("Parsed Parameters:", paramObj);

        switch (endpoint) {
            case "datasensors":
                setdatasensors(paramObj);
                break;
            default:
                console.log("Unknown endpoint");
        }
    };

    const setdatasensors = async (paramObj) => {
        try {
            // Adiciona o documento à coleção 'data'
            await addDoc(collection(db, 'data'), paramObj);
            console.log("Data added successfully:", paramObj);
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };

    const handleSubmit = () => {
        if (inputEndpoint && inputParam) {
            const formattedParam = inputParam.replace(/\n/g, '&');
            navigate(`/apirest?endpoint=${inputEndpoint}&${formattedParam}`);
        }
    };

    return (
        <div className="api-rest-container">
            <h1>API Rest Interface</h1>
            <div className="api-form">
                <div className="form-group">
                    <label htmlFor="endpoint">Endpoint:</label>
                    <input
                        type="text"
                        id="endpoint"
                        value={inputEndpoint}
                        onChange={(e) => setInputEndpoint(e.target.value)}
                        placeholder="/endpoint"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="param">Parameters:</label>
                    <textarea
                        id="param"
                        value={inputParam}
                        onChange={(e) => setInputParam(e.target.value)}
                        placeholder="param1=value1&#10;param2=value2"
                        rows="5"
                        style={{ width: '100%' }}
                    />
                </div>
                <button className="submit-button" onClick={handleSubmit}>Execute</button>
            </div>
        </div>
    );
}

export default ApiRest;
