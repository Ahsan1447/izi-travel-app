import React from 'react'

export default function IziTravelAudioWidget({ uuid, language }) {
  if (!uuid) return null
  return (
    <div>
      {}
      <script src="http://client-private-api-stage.izi.travel/widget.js"></script>
      <audio-tours
        uuid={uuid}
        language={language}
      ></audio-tours>
    </div>
  )
}
