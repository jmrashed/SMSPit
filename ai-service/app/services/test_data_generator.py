import random
from typing import TypedDict

SENDERS = ["SMSPit", "MyBank", "ShopNow", "Acme Inc", "QuickPay"]

OTP_TEMPLATES = [
    "Your OTP is {code}, valid for {minutes} minutes.",
    "{code} is your verification code. Do not share it with anyone.",
    "Use {code} to complete your sign-in. Expires in {minutes} minutes.",
]

MARKETING_TEMPLATES = [
    "Huge SALE! {percent}% off everything, shop now: http://example.com/sale",
    "FREE gift with every order this weekend only! Limited time offer.",
    "Flash deal: {percent}% off, today only. Click here to claim your prize!",
]

TRANSACTIONAL_TEMPLATES = [
    "Your order #{order_id} has shipped and will be delivered soon.",
    "Payment of ${amount} received. Thank you for your business.",
    "Your invoice #{order_id} for ${amount} is ready. Balance due on renewal.",
]

OTHER_TEMPLATES = [
    "Hey, are we still meeting for lunch tomorrow?",
    "Reminder: your appointment is scheduled for tomorrow at 10am.",
    "Thanks for reaching out, we'll get back to you shortly.",
]

TEMPLATES_BY_TYPE = {
    "otp": OTP_TEMPLATES,
    "marketing": MARKETING_TEMPLATES,
    "transactional": TRANSACTIONAL_TEMPLATES,
    "other": OTHER_TEMPLATES,
}


class GeneratedMessage(TypedDict):
    to: str
    from_: str
    message: str
    type: str


def _random_phone() -> str:
    return "+8801" + "".join(str(random.randint(0, 9)) for _ in range(9))


def _render(template: str) -> str:
    return template.format(
        code=random.randint(100000, 999999),
        minutes=random.choice([5, 10, 15]),
        percent=random.choice([10, 20, 30, 50, 70]),
        order_id=random.randint(10000, 99999),
        amount=round(random.uniform(9.99, 499.99), 2),
    )


def generate_messages(count: int, message_type: str | None) -> list[GeneratedMessage]:
    types = [message_type] if message_type else list(TEMPLATES_BY_TYPE.keys())

    generated: list[GeneratedMessage] = []
    for _ in range(count):
        chosen_type = random.choice(types)
        generated.append(
            {
                "to": _random_phone(),
                "from_": random.choice(SENDERS),
                "message": _render(random.choice(TEMPLATES_BY_TYPE[chosen_type])),
                "type": chosen_type,
            }
        )
    return generated
