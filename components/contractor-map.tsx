import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface ContractorMapProps {
  lat: number
  lng: number
  miles: number
  clientLat?: number
  clientLng?: number
}

// Contractor marker (green to represent service provider)
const contractorIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
})

// Client marker (blue to represent customer)
const clientIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
})

export default function ContractorMap({ lat, lng, miles, clientLat, clientLng }: ContractorMapProps) {
  // Convert miles to meters for Leaflet
  const radius = miles * 1609.34
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={8}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', borderRadius: 12, position: 'relative', zIndex: 0 }}
      dragging={true}
      doubleClickZoom={true}
      zoomControl={true}
      attributionControl={false}
      keyboard={false}
      touchZoom={true}
      boxZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Marker position={[lat, lng]} icon={contractorIcon}>
        <Popup>
          <div className="text-center">
            <strong>Contractor Location</strong>
            <br />
            <span className="text-sm text-gray-600">Service area: {miles} miles</span>
          </div>
        </Popup>
      </Marker>
      {clientLat && clientLng && (
        <Marker position={[clientLat, clientLng]} icon={clientIcon}>
          <Popup>
            <div className="text-center">
              <strong>Client Location</strong>
              <br />
              <span className="text-sm text-gray-600">Gig location</span>
            </div>
          </Popup>
        </Marker>
      )}
      <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15, weight: 2 }} />
    </MapContainer>
  )
} 