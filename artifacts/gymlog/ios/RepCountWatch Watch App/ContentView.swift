import SwiftUI
import WatchConnectivity
import CoreMotion
import Combine

class RepCounterSession: NSObject, ObservableObject, WCSessionDelegate {
    @Published var repCount = 0
    @Published var targetReps = 10
    @Published var isTracking = false
    @Published var isResting = false
    @Published var restSecondsLeft = 60
    @Published var debugMag: Double = 0

    private let motionManager = CMMotionManager()
    private let accelQueue = OperationQueue()
    private var lastRepTime: Date = .distantPast
    private let minRepInterval: TimeInterval = 0.55
    private let threshold: Double = 0.6
    private var magnitudeWindow: [Double] = []
    private let windowSize = 15
    private var restTimer: Timer?
    @Published var restDuration = 60

    override init() {
        accelQueue.name = "com.repcount.accel"
        accelQueue.maxConcurrentOperationCount = 1
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func handleCommand(_ message: [String: Any]) {
        guard let type = message["type"] as? String else { return }
        switch type {
        case "startTracking":
            let reps = message["targetReps"] as? Int ?? 10
            startTracking(targetReps: reps, fromPhone: true)
        case "stopTracking":
            stopTracking(sendToPhone: false)
        case "restStarted":
            let dur = message["duration"] as? Int ?? 60
            startRest(duration: dur)
        case "restEnded":
            endRest()
        default:
            break
        }
    }

    func startTracking(targetReps: Int, fromPhone: Bool) {
        guard !isTracking else { return }
        isResting = false
        restTimer?.invalidate()
        self.targetReps = targetReps
        self.repCount = 0
        self.isTracking = true
        self.magnitudeWindow = []
        self.lastRepTime = .distantPast

        guard motionManager.isAccelerometerAvailable else { return }
        motionManager.accelerometerUpdateInterval = 0.05
        motionManager.startAccelerometerUpdates(to: accelQueue) { [weak self] data, _ in
            guard let self, let data else { return }
            self.processAcceleration(data.acceleration)
        }
        if !fromPhone {
            WCSession.default.sendMessage(
                ["type": "watchStarted", "targetReps": targetReps],
                replyHandler: nil, errorHandler: nil
            )
        }
    }

    func stopTracking(sendToPhone: Bool = true) {
        motionManager.stopAccelerometerUpdates()
        let finalCount = repCount
        DispatchQueue.main.async { self.isTracking = false }
        if sendToPhone {
            WCSession.default.sendMessage(
                ["type": "watchStopped", "count": finalCount],
                replyHandler: nil, errorHandler: nil
            )
        }
    }

    func startRest(duration: Int) {
        restDuration = duration
        restSecondsLeft = duration
        isResting = true
        restTimer?.invalidate()
        restTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] t in
            guard let self else { t.invalidate(); return }
            DispatchQueue.main.async {
                if self.restSecondsLeft <= 1 {
                    self.endRest()
                    WKInterfaceDevice.current().play(.notification)
                } else {
                    self.restSecondsLeft -= 1
                    if self.restSecondsLeft == 10 {
                        WKInterfaceDevice.current().play(.directionDown)
                    }
                }
            }
        }
    }

    func endRest() {
        restTimer?.invalidate()
        restTimer = nil
        isResting = false
        restSecondsLeft = restDuration
    }

    private func processAcceleration(_ accel: CMAcceleration) {
        let mag = sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z)
        magnitudeWindow.append(mag)
        if magnitudeWindow.count > windowSize { magnitudeWindow.removeFirst() }
        DispatchQueue.main.async { self.debugMag = mag }
        guard magnitudeWindow.count >= 5 else { return }

        let avg = magnitudeWindow.reduce(0, +) / Double(magnitudeWindow.count)
        let now = Date()
        if abs(mag - avg) > threshold && now.timeIntervalSince(lastRepTime) > minRepInterval {
            lastRepTime = now
            let newCount = repCount + 1
            DispatchQueue.main.async {
                self.repCount = newCount
                // Strong haptic for each rep — .notification fires the taptic engine clearly
                WKInterfaceDevice.current().play(.notification)
                WCSession.default.sendMessage(
                    ["type": "rep", "count": newCount],
                    replyHandler: nil, errorHandler: nil
                )
                if newCount >= self.targetReps {
                    WKInterfaceDevice.current().play(.success)
                    self.stopTracking()
                }
            }
        }
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        guard state == .activated else { return }
        let ctx = session.receivedApplicationContext
        if let type = ctx["type"] as? String {
            DispatchQueue.main.async { self.handleCommand(ctx) }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
        DispatchQueue.main.async { self.handleCommand(ctx) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.handleCommand(message) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        replyHandler(["status": "ok"])
        DispatchQueue.main.async { self.handleCommand(message) }
    }
}

// MARK: - Views

struct RestView: View {
    let secondsLeft: Int
    let total: Int

    private var progress: Double {
        guard total > 0 else { return 0 }
        return Double(secondsLeft) / Double(total)
    }

    private var formatted: String {
        let m = secondsLeft / 60
        let s = secondsLeft % 60
        return m > 0 ? String(format: "%d:%02d", m, s) : "\(s)s"
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 6) {
                Text("REST")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.orange).kerning(1.5)

                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.25), lineWidth: 5)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(
                            progress > 0.3 ? Color.orange : Color.red,
                            style: StrokeStyle(lineWidth: 5, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 1), value: progress)

                    Text(formatted)
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(progress > 0.3 ? .white : .red)
                }
                .frame(width: 110, height: 110)

                Text("Next set ready soon")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
            }
            .padding(8)
        }
    }
}

struct TrackingView: View {
    @ObservedObject var counter: RepCounterSession

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 8) {
                Text("TRACKING")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.green).kerning(1)

                HStack(alignment: .lastTextBaseline, spacing: 2) {
                    Text("\(counter.repCount)")
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .foregroundColor(counter.repCount >= counter.targetReps ? .green : .white)
                    Text("/\(counter.targetReps)")
                        .font(.system(size: 20)).foregroundColor(.gray)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3).fill(Color.gray.opacity(0.3)).frame(height: 5)
                        RoundedRectangle(cornerRadius: 3)
                            .fill(counter.repCount >= counter.targetReps ? Color.green : Color.blue)
                            .frame(
                                width: geo.size.width * min(CGFloat(counter.repCount) / CGFloat(max(counter.targetReps, 1)), 1),
                                height: 5
                            )
                    }
                }.frame(height: 5).padding(.horizontal, 4)

                Text("accel: \(String(format: "%.2f", counter.debugMag))g")
                    .font(.system(size: 9)).foregroundColor(.gray)

                Button("Stop & Log") { counter.stopTracking() }
                    .tint(.red.opacity(0.8))
            }.padding(8)
        }
    }
}

struct ContentView: View {
    @StateObject private var counter = RepCounterSession()

    var body: some View {
        Group {
            if counter.isTracking {
                TrackingView(counter: counter)
            } else if counter.isResting {
                RestView(secondsLeft: counter.restSecondsLeft, total: counter.restDuration)
            } else {
                IdleView()
            }
        }
    }
}

struct IdleView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 10) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 28))
                    .foregroundColor(.blue.opacity(0.8))

                Text("RepCount")
                    .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)

                Text("Start a set on iPhone")
                    .font(.system(size: 12))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }.padding(8)
        }
    }
}
