import React, { useState, useEffect } from 'react';

function calculateLevel(user) {
    const missionsConcluded = user.missionsConcluded ? user.missionsConcluded : 0;
    let userLevel = 0;

    if (missionsConcluded >= 2) {
        userLevel = Math.floor(Math.log2(missionsConcluded / 2)) + 1;
    }

    return userLevel;
}

function LevelProgressBar({ user }) {
    const [userLevel, setUserLevel] = useState(0);
    const [missionsToNextLevel, setMissionsToNextLevel] = useState(0);

    useEffect(() => {
        const level = calculateLevel(user);
        setUserLevel(level);

        // Calculate missions needed for next level
        const nextLevelMissions = Math.pow(2, level) * 2;
        const missionsNeeded = nextLevelMissions - user.missionsConcluded;
        setMissionsToNextLevel(missionsNeeded);
    }, [user]);

    return (
        <div className='progressBarContainer'>
            <div>
                <progress value={user.missionsConcluded - missionsToNextLevel} max={missionsToNextLevel + user.missionsConcluded}></progress>
            </div>
            <div className='textProgress'>Conclua {missionsToNextLevel} missões para subir de nível</div>
        </div>
    );
}

export default LevelProgressBar;
