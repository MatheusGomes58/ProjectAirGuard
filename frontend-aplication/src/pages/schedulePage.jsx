import React, { useState, useEffect } from 'react';
import { auth, db } from '../components/firebase/firebase';
import { useNavigate } from 'react-router-dom';
import '../css/schedulePage.css';

const SchedulePage = () => {
    const [events, setEvents] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        userValidation();
    }, []);


    async function userValidation() {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) {
            navigate('/');
            return;
        }

        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - parseInt(authTime, 10);

        const threeHoursInMs = 3 * 60 * 60 * 1000;
        if (timeElapsed > threeHoursInMs) {
            navigate('/');
            return;
        }
    }

    useEffect(() => {
        const getEventsFromFirestore = () => {
            return db.collection('events')
                .where('department', '==', 'Jovem')
                //.where('active', '==', true)
                .onSnapshot(snapshot => {
                    const eventsData = {};

                    snapshot.docs.forEach(doc => {
                        const eventData = {
                            id: doc.id,
                            ...doc.data()
                        };

                        if (!eventsData[eventData.month]) {
                            eventsData[eventData.month] = [];
                        }

                        const dayNumber = Number(eventData.day);

                        if (eventData.startTime && typeof eventData.startTime === 'string') {
                            const hourMatch = eventData.startTime.match(/^(\d{1,2}):(\d{2})$/);

                            if (hourMatch) {
                                const [, hours, minutes] = hourMatch;
                                const timeInMinutes = parseInt(hours) * 60 + parseInt(minutes);

                                if (!isNaN(dayNumber)) {
                                    eventData.day = dayNumber;
                                    eventData.timeInMinutes = timeInMinutes;
                                    eventsData[eventData.month].push(eventData);
                                } else {
                                    console.error(`Invalid 'day' value for event with id ${eventData.id}`);
                                }
                            } else {
                                console.error(`Invalid 'hour' format for event with id ${eventData.id}`);
                            }
                        } else {
                            console.error(`Missing or invalid 'hour' value for event with id ${eventData.id}`);
                        }
                    });

                    const sortedMonths = Object.keys(eventsData).sort();

                    sortedMonths.forEach(month => {
                        eventsData[month].sort((a, b) => {
                            const aDay = !isNaN(a.day) ? a.day : Number(a.day) || 0;
                            const bDay = !isNaN(b.day) ? b.day : Number(b.day) || 0;

                            if (aDay !== bDay) {
                                return aDay - bDay;
                            } else {
                                return a.timeInMinutes - b.timeInMinutes;
                            }
                        });
                    });

                    const orderedEventsData = {};
                    sortedMonths.forEach(month => {
                        orderedEventsData[month] = eventsData[month];
                    });

                    setEvents(orderedEventsData);
                });
        };

        const unsubscribe = getEventsFromFirestore();

        return () => {
            unsubscribe();
        };
    }, []);


    return (
        <div className="schedulePage">
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Responsável</th>
                        <th>Descrição</th>
                        <th>Local</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(events).map(month => (
                        events[month].map(event => (
                            <tr key={event.id}>
                                <td className='limited-column'>{month}-{event.day} {event.endDay ? ' á ' + event.endDay : ''}</td>
                                <td className='limited-column'>{event.responsible}</td>
                                <td className='limited-column'>{event.description}</td>
                                <td className='limited-column'>{event.location}</td>
                            </tr>
                        ))
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SchedulePage;
