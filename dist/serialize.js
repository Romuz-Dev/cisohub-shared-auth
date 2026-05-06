export function serializeUserForClient(user) {
    return {
        id: user.id,
        email: user.email,
        name_ar: user.nameAr ?? null,
        name_en: user.nameEn ?? null,
        role: user.role,
        avatar: user.avatar ?? null,
        lang: user.lang ?? "ar",
        userType: user.userType,
        onboardingCompleted: user.onboardingCompleted,
        status: user.status,
    };
}
//# sourceMappingURL=serialize.js.map