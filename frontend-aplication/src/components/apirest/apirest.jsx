import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { FaCogs, FaPlay } from 'react-icons/fa';
import './apirest.css';

function ApiRest() {
    const navigate = useNavigate();
    const location = useLocation();
    const [method, setMethod] = useState('POST');
    const [endpoint, setEndpoint] = useState('');
    const [requestBody, setRequestBody] = useState('{}');
    const [response, setResponse] = useState('');

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const jsonStr = searchParams.get('data');
        if (jsonStr) {
            try {
                const decodedJsonStr = decodeURIComponent(jsonStr);
                const jsonObject = JSON.parse(decodedJsonStr);
                if (jsonObject.method && ['POST', 'PUT', 'DELETE'].includes(jsonObject.method)) {
                    setMethod(jsonObject.method);
                    setEndpoint(jsonObject.endpoint || '');
                    setRequestBody(JSON.stringify(jsonObject.data || {}));
                    handleApiRequest();
                } else {
                    setResponse('Invalid method in JSON data.');
                }
            } catch (error) {
                setResponse(`Error parsing JSON data: ${error.message}`);
            }
        }
    }, [location.search]);

    // Função para validar JSON
    const isValidJson = (jsonString) => {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (error) {
            return false;
        }
    };

    // Função para limpar a URL
    const clearUrl = () => {
        debugger
        navigate('/apirest');
    };

    // Função para captura da requisição
    const handleApiRequest = async () => {
        if (!isValidJson(requestBody)) {
            setResponse('Invalid JSON format. Please check your input.');
            return;
        }

        const body = JSON.parse(requestBody);

        try {
            switch (method) {
                case 'POST':
                    await addDoc(collection(db, endpoint), body);
                    setResponse(`Data successfully added to collection: ${endpoint}`);
                    break;
                case 'PUT':
                    if (!body.id) {
                        setResponse('PUT requires an "id" field in the JSON body to identify the document.');
                        return;
                    }
                    await setDoc(doc(db, endpoint, body.id), body.data, { merge: true });
                    setResponse(`Document with id: ${body.id} successfully updated in collection: ${endpoint}`);
                    break;
                case 'DELETE':
                    if (!body.id) {
                        setResponse('DELETE requires an "id" field in the JSON body to identify the document.');
                        return;
                    }
                    await deleteDoc(doc(db, endpoint, body.id));
                    setResponse(`Document with id: ${body.id} successfully deleted from collection: ${endpoint}`);
                    break;
                default:
                    setResponse('Unsupported method');
                    break;
            }
            clearUrl(); // Limpa a URL após captura dos dados
        } catch (error) {
            setResponse(`Error: ${error.message}`);
        }
    };

    // Submissão manual do formulário
    const handleSubmit = (event) => {
        event.preventDefault();

        if (isValidJson(requestBody)) {
            // Codifica o JSON para a URL
            const encodedData = encodeURIComponent(JSON.stringify({ method, endpoint, data: JSON.parse(requestBody) }));
            navigate(`/apirest?data=${encodedData}`);
        } else {
            setResponse('Invalid JSON format. Please check your input.');
        }
    };

    return (
        <div className="api-rest-container">
            <h1><FaCogs /> API Rest Interface</h1>
            <form onSubmit={handleSubmit}>
                <div className="api-form">
                    <div className="form-group">
                        <label htmlFor="method">Method:</label>
                        <select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="endpoint">Endpoint (Collection Name):</label>
                        <input
                            type="text"
                            id="endpoint"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            placeholder="Collection Name"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="requestBody">Request Body (JSON):</label>
                        <textarea
                            id="requestBody"
                            value={requestBody}
                            onChange={(e) => setRequestBody(e.target.value)}
                            rows="5"
                            style={{ width: '100%' }}
                            placeholder='{"data": { "key": "value" }, "id": "documentId"}'
                        />
                    </div>
                    <button className="submit-button" type="submit">
                        <FaPlay /> Execute
                    </button>
                </div>
            </form>
            {response && (
                <div className="api-response">
                    <h3>Response:</h3>
                    <pre>{response}</pre>
                </div>
            )}
        </div>
    );
}

export default ApiRest;
