import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './apirest.css'; // Adicione esta linha para importar o arquivo CSS

function ApiRest() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const endpoint = searchParams.get("endpoint");
    const param = searchParams.get("param");

    const [inputEndpoint, setInputEndpoint] = useState('');
    const [inputParam, setInputParam] = useState('');

    React.useEffect(() => {
        if (endpoint) {
            handleApiCall(endpoint, param);
        }
    }, [endpoint, param]);

    const handleApiCall = (endpoint, param) => {
        switch (endpoint) {
            case "getUser":
                getUser(param);
                break;
            case "createUser":
                createUser(param);
                break;
            default:
                console.log("Unknown endpoint");
        }
    };

    const getUser = (id) => {
        console.log(`Fetching user with ID: ${id}`);
        alert(`Fetched user with ID: ${id}`);
    };

    const createUser = (name) => {
        console.log(`Creating user with name: ${name}`);
        alert(`Created user with name: ${name}`);
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
                        rows="5" // Definindo o tamanho do textarea
                        style={{ width: '100%' }} // Garantindo que o textarea ocupe 100% da largura disponível
                    />
                </div>
                <button className="submit-button" onClick={handleSubmit}>Execute</button>
            </div>
            <div className="api-examples">
                <h2>Examples</h2>
                <button onClick={() => navigate('/apirest?endpoint=getUser&param=1')}>Test GetUser</button>
                <button onClick={() => navigate('/apirest?endpoint=createUser&param=John')}>Test CreateUser</button>
            </div>
        </div>
    );
}

export default ApiRest;
