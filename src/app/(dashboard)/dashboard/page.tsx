export default function DashboardPage() {
    return (
        <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Dashboard cards will go here */}
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Total Projects</h3>
                    </div>
                    <div className="text-2xl font-bold">12</div>
                </div>
            </div>
        </div>
    );
}
