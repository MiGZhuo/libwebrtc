import { peerConn, peerState } from './types'
import peer from './peer'
import { ws } from './util/util'

const streams = new Map<string, peer>()

export default class {


    constructor(private readonly servers: RTCConfiguration) {

    }

    private createPassive(uid: string) {
        const s = new peer(uid, true, this.servers);
        streams.set(uid, s)
    }

    private createPositive(uid: string) {
        const s = new peer(uid, false, this.servers)
        streams.set(uid, s)
    }

    public ensureWaitIds(ids: Array<string>) {
        ids.forEach(id => {
            if (streams.has(id)) {
                // 是我断线重连,无论这些ID中,之前有我主动链接他的,也有他主动链接我的
                // 我重新上线后,都变成他们主动链接我
                const s = streams.get(id)
                s.waitForConnect()
            } else {
                // 是我首次上线,我需要等待这些id链接我
                this.createPassive(id);
            }
        })
    }

    public ensureToConnect(id: string) {
        if (streams.has(id)) {
            // 如果对方是断线重连,无论之前是他早于我上线(他链接的我),还是我早于他上线(我链接的他)
            // 再次上线后,都变成我主动链接他
            const s = streams.get(id)
            if (s.state !== peerState.OK) {
                s.connect()
            }
        } else {
            // 如果对方是首次上线,我方应该主动
            this.createPositive(id)
        }
    }

    // 我方上线消息被对方察觉,然后主动链接我方,向我发来了offer
    // 我方应 setRemoteDescription,createAnswer,setLocalDescription,ws.send
    public async onOffer(from: string, sdp: RTCSessionDescription) {
        const s = streams.get(from)
        if (!s) {
            console.error("peer error")
            return
        }
        s.onOffer(sdp)
    }

    // 我发送的offer对方给了回应,我马上就可以链接他了
    public async onAnswer(from: string, sdp: RTCSessionDescription) {
        const s = streams.get(from)
        if (!s) {
            console.error("peer error")
            return
        }
        s.onAnswer(sdp)
    }

    public async onCandidate(from: string, candidate: RTCIceCandidate) {
        const s = streams.get(from)
        if (!s) {
            console.error("peer error")
            return
        }
        s.onCandidate(candidate)
    }

}