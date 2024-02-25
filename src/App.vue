<template>
    <main>
        <div class="wrapper">
            <div class="mt-3">
                <div class="row g-3 align-items-center">
                    <div class="col-auto">
                        <select
                            class="form-select"
                            v-model="selectedFilter">
                            <option value="">Выберите поле фильтра</option>
                            <option value="product">Название</option>
                            <option value="price">Цена</option>
                            <option value="brand">Бренд</option>
                        </select>
                    </div>
                    <div
                        class="col-auto"
                        v-if="selectedFilter === 'product'">
                        <input
                            type="text"
                            class="form-control"
                            v-model="filterValue"
                            placeholder="Введите название" />
                    </div>
                    <div
                        class="col-auto"
                        v-if="selectedFilter === 'price'">
                        <input
                            type="number"
                            class="form-control"
                            v-model="filterValue"
                            placeholder="Введите цену" />
                    </div>
                    <div
                        class="col-auto"
                        v-if="selectedFilter === 'brand'">
                        <input
                            type="text"
                            class="form-control"
                            v-model="filterValue"
                            placeholder="Введите бренд" />
                    </div>
                    <div class="col-auto">
                        <button
                            class="btn btn-primary filter_btn"
                            @click="filterItems(selectedFilter)">
                            {{ !loading ? "Применить фильтр" : "Загрузка" }}
                        </button>
                    </div>
                </div>
            </div>
            <table class="table mt-3">
                <thead>
                    <tr class="table_header">
                        <th scope="col">№</th>
                        <th scope="col">Id</th>
                        <th scope="col">Продукт</th>
                        <th scope="col">Цена</th>
                        <th scope="col">Бренд</th>
                    </tr>
                </thead>
                <tbody
                    v-if="!isError"
                    v-for="(item, i) in itemsList"
                    :key="item.id">
                    <tr>
                        <th scope="row">{{ numOfPage ? i + 1 + (numOfPage - 1) * itemsPerRange : i + 1 }}</th>
                        <td>{{ item.id }}</td>
                        <td>{{ item.product }}</td>
                        <td>{{ item.price }}</td>
                        <td>{{ item.brand }}</td>
                    </tr>
                </tbody>
                <p v-if="!isError && loading">идет загрузка...</p>
                <p v-if="isError">что-то пошло не так...</p>
            </table>
            <div>
                <nav aria-label="Page navigation">
                    <paginate
                        :page-count="Math.ceil((totalItems - 1) / itemsPerRange)"
                        :page-range="3"
                        :margin-pages="2"
                        :click-handler="getItemsPerPage"
                        :prev-text="'Prev'"
                        :next-text="'Next'"
                        :container-class="'pagination'"
                        :page-class="'page-item'">
                    </paginate>
                </nav>
            </div>
        </div>
    </main>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { md5 } from "js-md5";

function makingDate() {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    return `${year}${month}${day}`;
}

const timestamp = makingDate();
const authString = `Valantis_${timestamp}`;
const hash = md5(authString);

const itemsPerRange = 50;

//функция по получению данных у API
const postData = async (url = "", data = {}) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Auth": hash,
        },
        body: JSON.stringify(data),
    });
    return response.json();
};

const itemsList = ref(null);
const totalItems = ref(0);
const isError = ref(false);

//получение списка товаров
function getItemsById(attempt = 1) {
    loading.value = true;
    postData("http://api.valantis.store:40000/", {
        action: "get_ids",
        params: { limit: itemsPerRange },
    })
        .then((res) => {
            getItems(res);
        })
        .catch((err) => {
            isError.value = true;
            console.log(err);
            if (attempt <= 3) {
                console.log(`Попытка №${attempt}: Повторный запрос...`);
                getItemsById(pageNum, attempt + 1);
            }
        });
}
onMounted(() => {
    getItemsById(), getTotalLength();
});

//запрос для подсчета общего количества товаров
function getTotalLength(attempt = 1) {
    postData("http://api.valantis.store:40000/", {
        action: "get_ids",
        params: {},
    })
        .then((res) => {
            const uniqueIds = [...new Set(res.result)]; //удаление дубликатов id
            totalItems.value = uniqueIds.length;
            isError.value = false;
        })
        .catch((err) => {
            isError.value = true;
            console.log(err);
            if (attempt <= 3) {
                console.log(`Попытка №${attempt}: Повторный запрос...`);
                getTotalLength(attempt + 1);
            }
        });
}

//удаление дубликатов товаров
function removeDublicates(arr) {
    return arr.reduce((res, item) => {
        const isDublicateId = res.find((el) => el.id === item.id, []);
        if (!isDublicateId) {
            res.push(item);
        }
        return res;
    }, []);
}

//запрос при клике на страницу
let offset = 0;
let numOfPage = 0;
function getItemsPerPage(pageNum, attempt = 1) {
    window.scrollTo(0, 0);
    loading.value = true;
    itemsList.value = null;
    numOfPage = pageNum;
    offset = (offset + itemsPerRange) * pageNum;
    postData("http://api.valantis.store:40000/", {
        action: "get_ids",
        params: { offset: offset, limit: itemsPerRange },
    })
        .then((res) => {
            getItems(res);
        })
        .catch((err) => {
            isError.value = true;
            console.log(err, "getItemsPerPage");
            if (attempt <= 3) {
                console.log(`Попытка №${attempt}: Повторный запрос...`);
                getItemsPerPage(pageNum, attempt + 1);
            }
        });
}

//фильтрация по заголовкам таблицы
const selectedFilter = ref("");
const filterValue = ref(null);
const loading = ref(false);

function filterItems(name, attempt = 1) {
    if (typeof filterValue === "string") {
        filterValue = filterValue.trim();
    }

    loading.value = true;
    postData("http://api.valantis.store:40000/", {
        action: "filter",
        params: {
            [name]: filterValue.value,
        },
    })
        .then((res) => {
            getItems(res);
        })
        .catch((err) => {
            isError.value = true;
            console.log(err);
            if (attempt <= 3) {
                console.log(`Попытка №${attempt}: Повторный запрос...`);
                filterItems(name, attempt + 1);
            }
        });
}

//получение списка товаров get_items
function getItems(res) {
    postData("http://api.valantis.store:40000/", {
        action: "get_items",
        params: { ids: res.result },
    }).then((data) => {
        itemsList.value = removeDublicates(data.result);
        isError.value = false;
        loading.value = false;
    });
}
</script>

<style scoped>
thead tr th,
tbody tr th {
    font-weight: bold !important;
}

button,
button:hover,
button:focus {
    background-color: white !important;
    border-color: lightgray !important;
    color: black;
}

button:hover {
    transition: all 0.3s linear;
    background-color: lightgray !important;
    color: black !important;
}
.filter_btn {
    width: 171px;
}
</style>
