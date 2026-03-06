import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase.jsx';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../css/mapPage.css';
import { FiMapPin } from 'react-icons/fi';
import { useLocale } from '../context/LocaleContext';

// Fix default Leaflet icon paths broken by module bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom green marker icon
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Inner component to fly-to using Leaflet's useMap hook
function FlyToController({ target }) {
    const map = useMap();
    useEffect(() => {
        if (target) {
            try { map.flyTo(target, 15, { animate: true, duration: 1 }); }
            catch (e) { map.setView(target, 15); }
        }
    }, [target, map]);
    return null;
}

function MapPage() {
    const navigate = useNavigate();
    const { t } = useLocale();
    const [devices, setDevices] = useState([]);
    const [flyTarget, setFlyTarget] = useState(null);

    // Auth guard
    useEffect(() => {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) { navigate('/'); return; }
        if (new Date().getTime() - parseInt(authTime, 10) > 3 * 60 * 60 * 1000) { navigate('/'); return; }
    }, [navigate]);

    // Load devices from Firestore
    useEffect(() => {
        const currentUserUid = localStorage.getItem('uid');
        const unsubscribe = db.collection('devices')
            .where('uids', 'array-contains', currentUserUid)
            .onSnapshot(snapshot => {
                const devicesData = snapshot.docs
                        .map(doc => {
                            const data = doc.data();
                            const userData = data.usersData?.find(u => u.uid === currentUserUid);
                            return { id: doc.id, ...data, name: userData ? userData.name : data.name || t('deviceFallbackName') };
                        })
                    .filter(device => device.latitude != null && device.longitude != null);
                setDevices(devicesData);
            });
        return () => unsubscribe();
    }, []);

    const devicesTotal = devices.length;
    const defaultCenter = [-14.235, -51.9253];
    const mapCenter = devices.length > 0 ? [devices[0].latitude, devices[0].longitude] : defaultCenter;

    return (
        <div className="mapPage">
            <div className="mapHeader">
                <div className="mapHeaderText">
                    <p className="mapGreeting">{t('mapGreeting')}</p>
                    <h2 className="mapTitle">{t('mapTitle')}</h2>
                </div>
                <div className="mapStats">
                    <span className="mapStatBadge">
                        <FiMapPin size={12} />
                        {devicesTotal} {devicesTotal === 1 ? t('devices') : t('devices_plural')}
                    </span>
                </div>
            </div>

            {devices.length === 0 ? (
                <div className="mapEmptyState">
                    <FiMapPin size={48} />
                    <p>{t('noDevicesLine1')}<br />{t('noDevicesLine2')}</p>
                </div>
            ) : (
                <>
                    <div className="mapContainer">
                        <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <FlyToController target={flyTarget} />
                            {devices.map(device => (
                                <Marker key={device.id} position={[device.latitude, device.longitude]} icon={greenIcon}>
                                    <Popup>
                                        <div className="popup-name">{device.name}</div>
                                        <div className={`popup-status ${device.state ? '' : 'off'}`}>
                                            {device.state ? `● ${t('deviceOn')}` : `○ ${t('deviceOff')}`}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    <div className="mapDeviceList">
                        <p className="mapDeviceListTitle">{t('devicesListTitle')}</p>
                        {devices.map(device => (
                            <div key={device.id} className="mapDeviceItem" onClick={() => setFlyTarget([device.latitude, device.longitude])}>
                                <div className="mapDeviceItemIcon"><i className="fas fa-microchip"></i></div>
                                <div className="mapDeviceItemInfo">
                                    <div className="mapDeviceItemName">{device.name}</div>
                                    <div className="mapDeviceItemCoords">
                                        {Number(device.latitude).toFixed(5)}, {Number(device.longitude).toFixed(5)}
                                    </div>
                                </div>
                                <span className={`mapDeviceItemBadge ${device.state ? 'on' : 'off'}`}>
                                    {device.state ? t('deviceOn') : t('deviceOff')}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default MapPage;
