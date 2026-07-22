import React from 'react'

interface ShowCardProps {
    icao24: string;
    callsign: string | null;
    arrivalAirport: string | null;
    departureAirport: string | null;
    currentPosition: string;


}
export const ShowCard = ({ icao24, callsign, arrivalAirport, departureAirport, currentPosition }: ShowCardProps) => {
    return (
        <div>
            <div className='border-2 border-gray-300 rounded-lg p-4 mb-4 cursor-pointer' >
                <h2 className='text-lg font-semibold'>{callsign || 'Unknown Callsign'}</h2>
                <p className='text-sm text-gray-600'>ICAO24: {icao24}</p>
                <p className='text-sm text-gray-600'>Arrival Airport: {arrivalAirport || 'Unknown'}</p>
                <p className='text-sm text-gray-600'>Departure Airport: {departureAirport || 'Unknown'}</p>
                <p className='text-sm text-gray-600'>Current Position: {currentPosition}</p>
            </div>
        </div>
    )
}

export const showCard = ShowCard;
