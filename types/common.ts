export type CouchUuid = string
export type CouchRevId = `${number}-${string}`

export interface CouchDoc {
  _id: CouchUuid
  _rev: CouchRevId
}

export type LatLng = [ number, number ]

export type Url = `http${string}`

export type ImageHash = string
