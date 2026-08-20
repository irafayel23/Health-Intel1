export default function DataManagementPanel() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
      <p className="text-gray-600 mb-6">
        Add / edit / delete system database records.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Barangay
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-600">#001</td>
              <td className="px-4 py-3 font-semibold">Luz Villanueva</td>
              <td className="px-4 py-3">San Jose</td>
              <td className="px-4 py-3">
                <a
                  href="#"
                  className="text-green-600 font-bold hover:underline"
                >
                  Manage
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
