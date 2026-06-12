#!/usr/bin/env python3
"""
simulate_metrics.py
───────────────────
Giả lập đẩy metrics ED-137 vào Pushgateway để test dashboard Grafana trong lab.
Sử dụng khi không kết nối được thiết bị thực (10.60.x.x).

Chạy: python simulate_metrics.py [--mode normal|warn|crit|random] [--loop]

Pushgateway: http://localhost:9091
"""

import argparse, random, time, sys
try:
    import requests
except ImportError:
    print("Thiếu thư viện requests. Chạy: pip install requests")
    sys.exit(1)

PUSHGATEWAY = "http://localhost:9091"

# ── Ngưỡng ED-137 ──────────────────────────────────────────────────────
# Bình thường (OK): Jitter < 10ms, Loss < 0.1%, Delay < 50ms
# Cảnh báo (WARN) : Jitter 10–20ms, Loss 0.1–1%, Delay 50–100ms
# Vi phạm (CRIT)  : Jitter > 20ms,  Loss > 1%,   Delay > 100ms
# ───────────────────────────────────────────────────────────────────────

PROFILES = {
    "normal": {
        "jitter_tx":   (1.5, 6.0),
        "jitter_rx":   (1.2, 5.5),
        "loss_tx":     (0.00, 0.05),
        "loss_rx":     (0.00, 0.04),
        "delay_tx":    (12.0, 45.0),
        "delay_rx":    (11.0, 42.0),
    },
    "warn": {
        "jitter_tx":   (10.5, 18.0),
        "jitter_rx":   (11.0, 17.5),
        "loss_tx":     (0.12, 0.80),
        "loss_rx":     (0.10, 0.75),
        "delay_tx":    (52.0, 90.0),
        "delay_rx":    (55.0, 88.0),
    },
    "crit": {
        "jitter_tx":   (22.0, 45.0),
        "jitter_rx":   (25.0, 50.0),
        "loss_tx":     (1.2,  5.0),
        "loss_rx":     (1.5,  6.0),
        "delay_tx":    (105.0, 180.0),
        "delay_rx":    (110.0, 200.0),
    },
}


def rand_val(lo, hi):
    return round(random.uniform(lo, hi), 3)


def build_metrics(profile: dict) -> str:
    """Tạo chuỗi metrics theo định dạng Prometheus text format."""
    jt = rand_val(*profile["jitter_tx"])
    jr = rand_val(*profile["jitter_rx"])
    lt = rand_val(*profile["loss_tx"])
    lr = rand_val(*profile["loss_rx"])
    dt = rand_val(*profile["delay_tx"])
    dr = rand_val(*profile["delay_rx"])

    return f"""# HELP vatm_voip_jitter_ms ED-137 VoIP Jitter (ms) — Ansible giả lập
# TYPE vatm_voip_jitter_ms gauge
vatm_voip_jitter_ms{{site="tx",link="tx_to_atcc",unit="ms"}} {jt}
vatm_voip_jitter_ms{{site="rx",link="atcc_to_rx",unit="ms"}} {jr}
# HELP vatm_voip_loss_percent ED-137 Packet Loss (%) — Ansible giả lập
# TYPE vatm_voip_loss_percent gauge
vatm_voip_loss_percent{{site="tx",link="tx_to_atcc",unit="percent"}} {lt}
vatm_voip_loss_percent{{site="rx",link="atcc_to_rx",unit="percent"}} {lr}
# HELP vatm_voip_one_way_delay_ms ED-137 One-way Delay (ms) — Ansible giả lập
# TYPE vatm_voip_one_way_delay_ms gauge
vatm_voip_one_way_delay_ms{{site="tx",link="tx_to_atcc",unit="ms"}} {dt}
vatm_voip_one_way_delay_ms{{site="rx",link="atcc_to_rx",unit="ms"}} {dr}
"""


def push(metrics_text: str, job: str = "ansible_vatm_simulate") -> bool:
    url = f"{PUSHGATEWAY}/metrics/job/{job}/instance/lab_simulate"
    try:
        r = requests.post(url, data=metrics_text.encode("utf-8"),
                          headers={"Content-Type": "text/plain"},
                          timeout=5)
        return r.status_code in (200, 204)
    except Exception as e:
        print(f"  ✗ Lỗi kết nối Pushgateway: {e}")
        return False


def status_icon(val, ok_max, warn_max):
    if val <= ok_max:   return "🟢"
    if val <= warn_max: return "🟡"
    return "🔴"


def print_row(label, val, unit, ok_max, warn_max):
    icon = status_icon(val, ok_max, warn_max)
    print(f"  {icon} {label:<28} {val:>8.3f} {unit}")


def main():
    parser = argparse.ArgumentParser(description="Giả lập metrics ED-137 → Pushgateway")
    parser.add_argument("--mode",   default="normal",
                        choices=["normal","warn","crit","random","cycle"],
                        help="Chế độ giả lập (default: normal)")
    parser.add_argument("--loop",   action="store_true",
                        help="Chạy liên tục mỗi 15 giây (Ctrl+C để dừng)")
    parser.add_argument("--interval", type=int, default=15,
                        help="Khoảng thời gian giữa 2 lần push khi --loop (giây)")
    args = parser.parse_args()

    cycle_states = ["normal","normal","normal","warn","crit","warn","normal"]
    cycle_idx = 0

    print("=" * 60)
    print("  VATM ATCC Long Thành — ED-137 Metrics Simulator")
    print(f"  Pushgateway : {PUSHGATEWAY}")
    print(f"  Chế độ     : {args.mode}")
    print(f"  Loop       : {'CÓ (' + str(args.interval) + 's)' if args.loop else 'KHÔNG'}")
    print("=" * 60)

    while True:
        # Chọn profile
        if args.mode == "random":
            mode = random.choice(["normal","normal","warn","crit"])
        elif args.mode == "cycle":
            mode = cycle_states[cycle_idx % len(cycle_states)]
            cycle_idx += 1
        else:
            mode = args.mode

        profile = PROFILES[mode]
        metrics = build_metrics(profile)

        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n[{ts}] Đẩy metrics — Mode: {mode.upper()}")

        ok = push(metrics)
        if ok:
            print("  ✓ Pushgateway nhận thành công")
        else:
            print("  ✗ Thất bại — Kiểm tra: docker compose ps pushgateway")

        # Parse và in bảng
        jt = rand_val(*profile["jitter_tx"])
        jr = rand_val(*profile["jitter_rx"])
        lt = rand_val(*profile["loss_tx"])
        lr = rand_val(*profile["loss_rx"])
        dt = rand_val(*profile["delay_tx"])
        dr = rand_val(*profile["delay_rx"])
        print()
        print(f"  {'Chỉ số':<28} {'Giá trị':>8}   Ngưỡng ED-137")
        print("  " + "-"*50)
        print_row("Jitter TX→ATCC",  jt, "ms",  10.0, 20.0)
        print_row("Jitter ATCC→RX",  jr, "ms",  10.0, 20.0)
        print_row("Packet Loss TX",  lt, "%",   0.10,  1.0)
        print_row("Packet Loss RX",  lr, "%",   0.10,  1.0)
        print_row("One-way Delay TX",dt, "ms",  50.0,100.0)
        print_row("One-way Delay RX",dr, "ms",  50.0,100.0)
        print()
        print("  🟢 OK (<ngưỡng xanh)  🟡 WARN  🔴 CRIT (vi phạm ED-137)")

        if not args.loop:
            break

        print(f"\n  Chờ {args.interval}s... (Ctrl+C để dừng)")
        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n  Đã dừng.")
            break


if __name__ == "__main__":
    main()
